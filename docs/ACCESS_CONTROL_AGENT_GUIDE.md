# Access Control (RBAC + Role Hierarchy) — Implementation Guide for AI Coding Agents

Instructions for adding **organization-scoped, permission-based access control with a role-rank hierarchy** to a new project. It describes the design that was implemented and hardened in this repo (NestJS + Prisma API, React client) in a stack-neutral way, with code you can adapt.

> Read the whole document before writing code. Follow the phases in order. Adapt names to the target project's conventions (file layout, casing, ORM) — the **rules and invariants** are what matter, not the file names.

---

## 1. Goals and non-goals

**Goals**
- One place defines permissions, roles and hierarchy rules. No hand-written role checks anywhere else.
- **Fail closed:** forgetting to protect an endpoint must be impossible to ship silently.
- **No privilege escalation:** a user can never grant, assign, edit or remove something at or above their own authority.
- Reads are protected, not only writes.
- The client mirrors the rules only to avoid offering forbidden actions; **the server is the security boundary**.
- The rules are pure functions, unit-tested without a framework.

**Non-goals**
- Per-record ownership rules (ABAC / "only my own items"). This system is org-level RBAC. Add resource-level checks in services if needed.
- Global (cross-tenant) super-admin roles. Keep those separate from organization roles.

---

## 2. Concepts

| Concept | Meaning |
| --- | --- |
| **Permission** | A fixed, code-defined capability, e.g. `PROJECTS_EDIT`. Stored as an enum. Never user-created. |
| **Role** | A per-organization named set of permissions. Has a `key` (system roles + `CUSTOM`), `is_system`, and a numeric **`rank`**. |
| **Membership** | A user's link to an organization with exactly one role and a status (`ACTIVE`/`SUSPENDED`). |
| **Rank** | Authority ladder. Higher outranks lower. You may only manage roles/members with a rank **strictly below** yours. |
| **Owner** | A system role above the ladder: may act on its own rank, holds every permission, immutable, at least one must exist. |
| **Requirement** | What a route/action needs: `all` permissions, `any` of several, `owner_only`, or `member_only` (explicit "any active member"). |
| **Actor** | The evaluated caller: `{ member_id, permissions:Set, rank, is_owner }`. |

Permission naming: `<AREA>_<ACTION>` upper snake (`PROJECTS_VIEW`, `ORG_MANAGE_ROLES`). Prefer a `*_VIEW` permission per area so reads can be gated. Split by real capability, not by screen.

---

## 3. Hierarchy rules (the security core)

Encode these **once**, as pure functions. Every mutation of roles/members/invitations must call them.

1. **Assign / invite** a role only if `role.rank < actor.rank` (owners exempt).
2. **Modify or remove a member** only if `member.rank < actor.rank`, and **never yourself** (owners exempt from the rank check, *not* from the self check).
3. **Create a role** only with `rank < actor.rank`.
4. **Grant permissions** to a role only if you hold each of them (owners exempt). When editing, only *newly added* permissions are checked.
5. **Edit / delete a role** only if `role.rank < actor.rank`. The Owner role is immutable. System roles can't be deleted; roles with members can't be deleted.
6. **Last owner invariant:** demoting or removing the last active owner is rejected (keep this as a separate DB-backed check).
7. **Invitations:** creating and revoking use rule 1 against the invitation's role.

Denials return `403` with `{ message, code }`; codes: `MISSING_PERMISSION`, `OWNER_ONLY`, `RANK_TOO_LOW`, `GRANT_EXCEEDS_OWN`, `SELF_MODIFICATION`, `IMMUTABLE_ROLE`.

Default system role ladder (adjust the presets, keep the shape): `OWNER 100 > ADMIN 80 > MANAGER 60 > DEVELOPER/MEMBER 40 > VIEWER 20`; custom roles default to `min(50, creator.rank - 1)` and may be given an explicit rank `1..99`.

---

## 4. Phase 0 — Audit the target project first

Before coding, produce a short inventory (do not skip; it decides the permission catalog):

1. List every controller/route: method, path, what it reads/writes, and any existing auth checks.
2. List every UI action, screen, nav item, dialog and background/IPC/desktop-native operation that mutates or exposes data.
3. Note operations that **never reach the server** (local file/git/process actions in a desktop app, client-only features). The server cannot enforce these — see §9.
4. Find existing role/permission code (inline `role === 'ADMIN'`, ad hoc owner checks). Plan to delete all of it.
5. Draft the permission catalog (§5) and map every route/action to a permission.

---

## 5. Phase 1 — Data model

Add to the schema (Prisma shown; translate for other ORMs):

```prisma
enum PermissionKey {
  PROJECTS_VIEW
  PROJECTS_EDIT
  // ... your catalog
  ORG_MANAGE_MEMBERS
  ORG_MANAGE_ROLES
  ORG_MANAGE_SETTINGS
}

enum SystemRoleKey { OWNER ADMIN MANAGER DEVELOPER VIEWER CUSTOM }
enum MemberStatus  { ACTIVE SUSPENDED }

model Role {
  id              String        @id @default(uuid())
  organization_id String
  name            String
  key             SystemRoleKey @default(CUSTOM)
  description     String?
  is_system       Boolean       @default(false)
  rank            Int           @default(10)
  permissions     RolePermission[]
  members         OrganizationMember[]
  organization    Organization  @relation(fields: [organization_id], references: [id], onDelete: Cascade)
  @@unique([organization_id, name])
}

model RolePermission {
  id         String        @id @default(uuid())
  role_id    String
  permission PermissionKey
  role       Role          @relation(fields: [role_id], references: [id], onDelete: Cascade)
  @@unique([role_id, permission])
}

model OrganizationMember {
  id              String       @id @default(uuid())
  organization_id String
  user_id         String
  role_id         String
  status          MemberStatus @default(ACTIVE)
  role            Role         @relation(fields: [role_id], references: [id], onDelete: Restrict)
  @@unique([organization_id, user_id])
}
```

Rules:
- `onDelete: Restrict` on member → role (a role in use can't vanish).
- **Migration for existing data:** add `rank` with a default, then backfill by `key` (`OWNER=100, ADMIN=80, ...`, existing custom roles = a mid value). Write the SQL by hand if you can't run the DB; do **not** apply migrations to shared/remote databases without the owner's confirmation.
- System roles are **seeded per organization at creation** inside the same transaction that creates the first owner membership (`createOrganizationWithOwner`). Existing orgs need a backfill script if you add a new permission to a preset.

---

## 6. Phase 2 — Server implementation (layered)

Keep four layers. Only the last two know about the framework.

```
interfaces   AccessActor, AccessRequirement, AccessDecision, DenialCodes, RoleTarget, MemberTarget
rules        pure functions: satisfies, isProtected, canAssignRole, canModifyMember,
             canGrantPermissions, canCreateRole, canEditRole, toActor   (no framework/ORM imports)
decorators   RequirePermissions, RequireAnyPermission, RequireOwner, OrgMemberOnly
guard        resolves membership, enforces requirement, fails closed
services     MembershipService (load active membership), AccessService (throwing assertions)
```

### 6.1 Permission catalog and role presets (single source of truth)

```ts
export const PermissionCatalog = [
  { key: PermissionKey.PROJECTS_VIEW, group: 'Projects', label: 'View' },
  // one entry per PermissionKey — a test asserts full coverage
];

export const DEFAULT_CUSTOM_ROLE_RANK = 50;

export const SystemRoles = [
  { key: SystemRoleKey.OWNER, name: 'Owner', rank: 100, description: '...', permissions: ALL_PERMISSIONS },
  { key: SystemRoleKey.ADMIN, name: 'Admin', rank: 80,  description: '...', permissions: ALL_PERMISSIONS },
  // ... presets with explicit permission lists
];
```

Expose the catalog via an authenticated endpoint so clients render permission matrices from it (do not duplicate labels client-side).

### 6.2 Pure rules

```ts
export interface AccessActor<P extends string = string> {
  member_id: string;
  permissions: ReadonlySet<P>;
  rank: number;
  is_owner: boolean;
}
export interface AccessRequirement<P extends string = string> {
  all?: readonly P[]; any?: readonly P[]; owner_only?: boolean; member_only?: boolean;
}
export interface AccessDecision { allowed: boolean; code?: DenialCode; reason?: string }

const outranks = (a: AccessActor, rank: number) => a.is_owner || a.rank > rank;

export const isProtected = (r: AccessRequirement) =>
  !!(r.all?.length || r.any?.length || r.owner_only || r.member_only);

export const satisfies = <P extends string>(a: AccessActor<P>, r: AccessRequirement<P>): AccessDecision => {
  if (r.owner_only && !a.is_owner) return deny('OWNER_ONLY', 'Only an owner can do this');
  const missing = (r.all ?? []).filter((p) => !a.permissions.has(p));
  if (missing.length) return deny('MISSING_PERMISSION', `Missing permission: ${missing.join(', ')}`);
  if (r.any?.length && !r.any.some((p) => a.permissions.has(p)))
    return deny('MISSING_PERMISSION', `Requires one of: ${r.any.join(', ')}`);
  return allow();
};

export const canAssignRole = (a: AccessActor, role: { rank: number }) =>
  outranks(a, role.rank) ? allow() : deny('RANK_TOO_LOW', 'You cannot assign a role at or above your own');

export const canModifyMember = (a: AccessActor, m: { member_id: string; rank: number }) => {
  if (m.member_id === a.member_id) return deny('SELF_MODIFICATION', 'You cannot change your own membership');
  return outranks(a, m.rank) ? allow() : deny('RANK_TOO_LOW', 'You cannot manage a member at or above your own role');
};

export const canGrantPermissions = <P extends string>(a: AccessActor<P>, granted: readonly P[]) => {
  if (a.is_owner) return allow();
  const excess = granted.filter((p) => !a.permissions.has(p));
  return excess.length ? deny('GRANT_EXCEEDS_OWN', `You cannot grant permissions you do not hold: ${excess.join(', ')}`) : allow();
};

export const canCreateRole = (a: AccessActor, rank: number) =>
  rank < a.rank ? allow() : deny('RANK_TOO_LOW', 'A new role must rank below your own');

export const canEditRole = <P extends string>(
  a: AccessActor<P>, role: { rank: number; immutable?: boolean }, current: readonly P[], next?: readonly P[],
) => {
  if (role.immutable) return deny('IMMUTABLE_ROLE', 'This role cannot be modified');
  if (!outranks(a, role.rank)) return deny('RANK_TOO_LOW', 'You cannot edit a role at or above your own');
  if (!next) return allow();
  return canGrantPermissions(a, next.filter((p) => !current.includes(p)));
};
```

> If the project compiles with `strictNullChecks: false`, discriminated unions do not narrow — use the flat `AccessDecision` shape above.

### 6.3 Decorators (metadata only)

```ts
export const RequirePermissions   = (...p: PermissionKey[]) => SetMetadata('access:all', p);
export const RequireAnyPermission = (...p: PermissionKey[]) => SetMetadata('access:any', p);
export const RequireOwner         = () => SetMetadata('access:owner', true);
export const OrgMemberOnly        = () => SetMetadata('access:member', true); // deliberate "any member"

export const readAccessRequirement = (reflector, ctx): AccessRequirement => ({
  all: reflector.getAllAndOverride('access:all',   [ctx.getHandler(), ctx.getClass()]),
  any: reflector.getAllAndOverride('access:any',   [ctx.getHandler(), ctx.getClass()]),
  owner_only:  reflector.getAllAndOverride('access:owner',  [ctx.getHandler(), ctx.getClass()]),
  member_only: reflector.getAllAndOverride('access:member', [ctx.getHandler(), ctx.getClass()]),
});
```

Handler-level metadata overrides class-level.

### 6.4 Guard — must fail closed

Runs **after** authentication. Steps: validate the organization header (UUID) → load the caller's **active** membership → reject non-members → read requirement → **reject if the route declares none** → `satisfies()` → attach `request.membership` for handlers → log denials.

```ts
@Injectable()
export class OrganizationGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const orgId = req.headers['x-organization-id'];
    if (typeof orgId !== 'string' || !UUID.test(orgId)) throw new BadRequestException('Missing or invalid organization header');

    const membership = await this.memberships.findActive(orgId, req.user?.id);
    if (!membership) throw new ForbiddenException('You are not a member of this organization');
    req.membership = membership;

    const requirement = readAccessRequirement(this.reflector, ctx);
    if (!isProtected(requirement)) {
      this.logger.error(`Route ${req.method} ${req.route?.path} declares no access requirement`);
      throw new ForbiddenException('This route declares no access requirement');
    }
    const decision = satisfies(toActor(membership), requirement);
    if (!decision.allowed) {
      this.logger.warn(`Denied ${req.method} ${req.route?.path} user=${req.user?.id} org=${orgId}: ${decision.code}`);
      throw new ForbiddenException({ message: decision.reason, code: decision.code });
    }
    return true;
  }
}
```

`MembershipService.findActive` loads member + role + permissions in one query and returns `{ organization_id, member_id, role_id, role_key, rank, permissions[] }`. Suspended or missing → `null`. Add short-lived caching only if profiling demands it, and invalidate on role/member changes.

`toActor(m)`: `{ member_id, permissions: new Set(m.permissions), rank: m.rank, is_owner: m.role_key === OWNER }`.

### 6.5 `AccessService` (used by feature services)

Thin throwing wrappers so feature code never touches the pure functions directly:

```ts
assertCanAssignRole(actor, role)            // rule 1
assertCanModifyMember(actor, member)        // rule 2
assertCanCreateRole(actor, rank, perms)     // rules 3 + 4
assertCanEditRole(actor, role, current, next) // rules 4 + 5
```

Each maps a denied decision to `ForbiddenException({ message, code })`. Make the module global (or import it wherever the guard is used — the guard's providers must resolve in the host module).

### 6.6 Applying to controllers

```ts
@Controller('projects')
@UseGuards(JwtGuard, OrganizationGuard)
export class ProjectsController {
  @Get()        @RequirePermissions(PermissionKey.PROJECTS_VIEW)   list() {}
  @Post()       @RequirePermissions(PermissionKey.PROJECTS_CREATE) create() {}
  @Delete(':id')@RequirePermissions(PermissionKey.PROJECTS_DELETE) remove() {}
}

@Controller('organizations/current')
@UseGuards(JwtGuard, OrganizationGuard)
export class CurrentOrganizationController {
  @Get()                 @OrgMemberOnly()                                         current() {}   // shell needs it
  @Delete()              @RequireOwner()                                           remove() {}
  @Get('members')        @RequireAnyPermission(ORG_MANAGE_MEMBERS, ORG_MANAGE_ROLES) members() {}
  @Patch('members/:id')  @RequirePermissions(ORG_MANAGE_MEMBERS)                   updateMember(@CurrentMembership() m, ...) {}
}
```

Pass the **whole membership** (not just org id) into services that mutate roles/members so they can run hierarchy assertions.

### 6.7 Service refactor for hierarchy

```ts
async updateMember(actor: Membership, memberId: string, dto) {
  const [member, role] = await Promise.all([
    this.prisma.organizationMember.findFirst({ where: { id: memberId, organization_id: actor.organization_id }, include: { role: true } }),
    this.prisma.role.findFirst({ where: { id: dto.role_id, organization_id: actor.organization_id } }),
  ]);
  if (!member) throw new NotFoundException();
  if (!role) throw new BadRequestException('Role does not belong to this organization');

  this.access.assertCanModifyMember(actor, { member_id: member.id, rank: member.role.rank });
  this.access.assertCanAssignRole(actor, { rank: role.rank });
  if (member.role.key === OWNER && role.key !== OWNER) await this.assertNotLastOwner(actor.organization_id);
  // ... update
}
```

Always scope lookups by the actor's `organization_id` (tenant isolation) — never trust an id from the request alone.

Create role: `rank = dto.rank ?? Math.min(DEFAULT_CUSTOM_ROLE_RANK, actor.rank - 1)` then `assertCanCreateRole`. Update role: load role with permissions, `assertCanEditRole(actor, { rank, immutable: key === OWNER }, currentPerms, dto.permissions)`; if a new rank is supplied for a non-system role, `assertCanCreateRole(actor, dto.rank, [])`. Ignore `name`/`rank` changes on system roles.

Return `rank` in role views, member role refs, and the "me/current organization" payload — the client needs it.

### 6.8 Read gating decisions

- Every read endpoint gets a VIEW permission or an any-of over the relevant managers. Data that only managers need (members, roles, invitations) → `RequireAnyPermission(MANAGE_MEMBERS, MANAGE_ROLES)` (the invite dialog needs the role list).
- Endpoints every member legitimately needs (current org shell data) → explicit `@OrgMemberOnly()`. Document why.
- Endpoints that don't depend on the active organization (list my orgs, create org, accept invitation, static catalog) sit behind authentication only, outside `OrganizationGuard`.
- Don't reuse a VIEW permission for a mutation. If an existing route does (e.g. a POST guarded by a view permission), note it and either fix it or record the reason.

---

## 7. Phase 3 — Tests (mandatory, they are the safety net)

1. **Rules unit tests** (pure, no framework): each function allow + deny; owner exemptions; self-modification blocked even for owners; "only *added* permissions checked" on edit; rank equality denied for non-owners.
2. **Guard tests** with a stub `MembershipService`: allows holder; rejects missing permission; `any` semantics; owner-only; member-only passes; **route with no decorator is rejected**; non-member rejected.
3. **Route coverage test** — walks every controller class, finds handlers behind `OrganizationGuard` (class- or method-level `__guards__` metadata) and asserts each declares a requirement. Uses `Reflect.getMetadata` + your `readAccessRequirement`; no app boot needed.

```ts
for (const cls of controllerClasses()) for (const name of methodsOf(cls)) {
  if (!usesOrganizationGuard(cls, cls.prototype[name])) continue;
  const req = readAccessRequirement(new Reflector(), { handler: cls.prototype[name], cls });
  if (!isProtected(req)) unprotected.push(`${cls.name}.${name}`);
}
expect(unprotected).toEqual([]);
```

   **Mutation-check it once:** delete a decorator, confirm the test fails, restore.
4. **Catalog consistency test:** every permission enum value appears once in the catalog; system role ranks are unique; presets reference valid keys; Owner has the top rank and all permissions.
5. Jest config needs the same path aliases as the build (`moduleNameMapper`) and importing generated ORM clients must work in tests.

---

## 8. Phase 4 — Client implementation

The client only decides what to **offer**. Never rely on it for security.

### 8.1 Pure helpers (one utils file)

```ts
export type Requirement<P extends string = string> = P | { all: readonly P[] } | { any: readonly P[] };

export const satisfiesRequirement = <P extends string>(held: ReadonlySet<P>, r: Requirement<P>) =>
  typeof r === 'string' ? held.has(r) : 'all' in r ? r.all.every((p) => held.has(p)) : r.any.some((p) => held.has(p));

export interface AccessGated<P extends string = string> { permission?: Requirement<P> }
export const filterByAccess = <P extends string, T extends AccessGated<P>>(items: readonly T[], can: (r: Requirement<P>) => boolean) =>
  items.filter((i) => !i.permission || can(i.permission));

// Mirrors of the server hierarchy rules, used only to avoid offering forbidden choices
export const canAssignRole      = (actor, role)   => actor.is_owner || actor.rank > role.rank;
export const canModifyMember    = (actor, member) => member.user_id !== actor.user_id && (actor.is_owner || actor.rank > member.rank);
export const canEditRole        = (actor, role, ownerKey) => role.key !== ownerKey && (actor.is_owner || actor.rank > role.rank);
export const canGrantPermission = (actor, p)      => actor.is_owner || actor.permissions.has(p);
```

### 8.2 Single access hook

Derive everything from the same profile query that returns the caller's active-organization role, rank and permissions.

```ts
export const usePermissions = () => {
  const { organization, me, isPending } = useCurrentOrganization();
  return useMemo(() => {
    const permissions = new Set(organization?.permissions ?? []);
    const actor = organization && me
      ? { user_id: me.id, rank: organization.role.rank, is_owner: organization.role.key === 'OWNER', permissions }
      : null;
    return {
      ready: !isPending,           // never hide/redirect while false
      permissions, actor,
      can:    (r: Requirement) => satisfiesRequirement(permissions, r),
      canAll: (...l) => satisfiesRequirement(permissions, { all: l }),
      canAny: (...l) => satisfiesRequirement(permissions, { any: l }),
    };
  }, [organization, me, isPending]);
};
```

### 8.3 Gate components

```tsx
export const Can = ({ permission, fallback = null, children }) => {
  const { can } = usePermissions();
  return <>{can(permission) ? children : fallback}</>;
};

export const RequirePermission = ({ permission, redirectTo, children }) => {
  const { ready, can } = usePermissions();
  if (!ready) return <SkeletonPlaceholder />;
  if (!can(permission)) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
};
```

### 8.4 Where to gate (decision table)

| Need | Use |
| --- | --- |
| Nav item / tab / settings section / command-palette entry | Add `permission` to its **config entry**; render through `filterByAccess`. Config is the single source. |
| Deep link / whole screen | `<RequirePermission>` in the route tree (and inside the tab/section page for config-gated entries) |
| Button or block | `<Can>` or `can()` |
| Dialog opened from many places (shortcut, palette, buttons) | Gate **inside the dialog component** (`open={open && allowed}`); do not gate each opener |
| Keyboard shortcuts | Check permission inside the shortcut handler (read via ref to avoid stale closures) |
| Role/member/permission pickers | Use the hierarchy helpers so the UI only offers what the server accepts; the caller's own row is read-only |
| Lists that hit gated endpoints | Don't fire the query for callers who can't view it (render the component only under `<Can>`) |

Hide mutating controls; keep read-only views working. Surface the server's denial `message` in error toasts.

### 8.5 Config example

```ts
export const ProjectTabOptions = [
  { id: 'overview', label: 'Overview' },
  { id: 'git',      label: 'Git',      permission: 'GIT_VIEW_CHANGES' },
  { id: 'terminal', label: 'Terminal', permission: 'PROJECTS_EDIT' },
  { id: 'sessions', label: 'AI',       permission: { any: ['AI_USE_AGENTS', 'AI_START_AGENTS'] } },
];
// nav: filterByAccess(ProjectTabOptions, can).map(...)
// page: const req = ProjectTabOptions.find(t => t.id === id)?.permission; wrap in <RequirePermission> when set
```

---

## 9. Actions the server cannot see (desktop / local / client-only)

If features run outside the API (local git, shell, native processes), permissions for them can't be enforced server-side. Do all of:

1. Gate the UI centrally (§8.4) — declarative maps, not scattered checks.
2. **Defense in depth:** push the caller's permission snapshot to the privileged process (e.g. Electron main) on sign-in/org change/sign-out (empty on sign-out; default to **empty = deny** until first sync). Wrap privileged IPC handlers with `requires: [PERMISSION]` that reject when missing. Map every mutating channel; leave read-only ones open.
3. State plainly in docs that this is **not a security boundary** (a modified client can bypass it). Anything that must be enforced belongs on the server.

---

## 10. Cross-cutting requirements

- **Never** compare role names/keys in feature code (`role === 'ADMIN'`). Only permissions, plus the owner concept inside the access layer.
- No ad hoc owner/rank checks in services — call `AccessService`.
- Errors: `403` with `{ message, code }`; use `400` for malformed input and the last-owner invariant, `404` for missing records **within the caller's tenant**.
- Log denials (`warn`) and unprotected-route hits (`error`); never log tokens.
- Adding a permission = enum + catalog + role presets + (backfill existing orgs) + route decorators + client config; the catalog/coverage tests catch omissions.
- Documentation: add a short section to the project's engineering rules (where decorators/guard/rules/services live, "every org route must declare access", "no role-name checks", "gate via config + hooks") instead of separate READMEs.

---

## 11. Verification checklist

**Automated**
- [ ] Rules, guard, route-coverage and catalog tests pass; mutation-check performed.
- [ ] Typecheck/lint clean on server and client.

**Manual (per role: owner, admin, manager, developer, viewer, one custom role)**
- [ ] Admin cannot promote anyone to Owner, cannot grant a permission they lack, cannot edit/remove a peer or higher role, cannot change their own role.
- [ ] Removing/demoting the last owner is rejected.
- [ ] Viewer gets 403 on members/roles/invitations reads; gated tabs/sections/actions are hidden; deep links redirect.
- [ ] Role and invite pickers offer only assignable roles; permission matrix disables permissions the caller lacks.
- [ ] Suspended member and non-member get 403 on every org route.
- [ ] Server-invisible actions are blocked by the privileged-process guard when the snapshot lacks the permission.
- [ ] Migration applied on a **local/disposable** DB first; existing orgs backfilled.

---

## 12. Common pitfalls

- **Global mutable request state** for the membership: attach to the request only; never module-level variables.
- **Guard order:** authentication guard first, then the organization guard.
- **Trusting ids from the client:** always scope by the actor's organization.
- **Checking only writes:** reads leak data; gate them.
- **Owner treated as "has every permission" only:** owners also need the rank/self rules handled explicitly (self-modification still blocked; last-owner invariant still enforced).
- **Stale client permissions** after role changes: invalidate the profile query on role/membership mutations, and re-sync any privileged-process snapshot.
- **Hiding while loading:** unauthenticated-looking flashes/redirects when `ready` is false.
- **Editing generated ORM output by hand:** regenerate the client after schema changes.
- **Duplicated permission labels/ranks on the client:** derive from the server catalog and payloads.

---

## Appendix A — Engineering rules to add to the project (verbatim, adapt paths)

Add these to the project's existing agent/engineering rule files so future contributors and AI agents keep the system intact. Adjust file paths to the project's layout.

### Server rules (append to the "Authentication & Authorization" section)

```md
### Organization access control

Decorators in `shared/decorators/access.decorator.ts`, `OrganizationGuard` in `shared/guards/`,
rank/permission rules in `shared/utils/access/access.utils.ts`, and `AccessService` /
`MembershipService` in `shared/services/access/` (`AccessModule` is global).

- Org-scoped controllers use `@UseGuards(JwtGuard, OrganizationGuard)`; **every** route must declare
  `@RequirePermissions(...)`, `@RequireAnyPermission(...)`, `@RequireOwner()` or an explicit
  `@OrgMemberOnly()`. `OrganizationGuard` fails closed and the route-coverage spec fails the build otherwise
- Read endpoints are gated too (a VIEW permission or any-of managers), never left open by omission
- Role/member/permission mutations must call `AccessService` (`assertCanAssignRole`,
  `assertCanModifyMember`, `assertCanCreateRole`, `assertCanEditRole`) — never hand-roll owner/rank
  checks in services or compare `role_key` inline
- New permission: add it to the Prisma enum, `PermissionCatalog`, and the `SystemRoles` presets
  (the catalog spec verifies coverage)
```

### Client rules (new section, e.g. "Access control (permissions)")

```md
## Access control (permissions)

- Gate through `usePermissions()` — never compare role names in components
- Nav items, tabs, settings sections and palette entries declare `permission` in their config options
  entry and render through `filterByAccess` (`@/lib/access.utils`)
- Whole screens/deep links: `<RequirePermission>`; blocks/buttons: `<Can>` (both in `components/access/`)
- Dialogs opened from many places gate inside the dialog component, not at each opener
- Role/member/permission pickers use the hierarchy helpers in `@/lib/access.utils` so the UI only
  offers what the API accepts
- Do not hide or redirect while `usePermissions().ready` is false
- The client only decides what to offer; the API is the security boundary
```

Also list the new client folder in the project's structure tree, e.g.
`components/access/  # Permission gates (<Can>, <RequirePermission>)`.
