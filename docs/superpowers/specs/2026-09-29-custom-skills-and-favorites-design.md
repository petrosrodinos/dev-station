# Custom Skills CRUD & Favorites — Design

## Context

Today the Skills tab (`app/src/pages/workspace/pages/project/pages/skills`) only
discovers skills by scanning the filesystem (`app/electron/skills/skill-scanner.ts`)
across known provider locations (Claude, Cursor, Codex, Gemini, Copilot) and any
user-added custom folders (`workspace.json`'s `skill_folders`). Everything is
ephemeral and read-only: there is no server-side skills concept at all
(`api/src` has zero references to skills), and there is no favorites concept
anywhere in the codebase.

This design adds:
1. **Custom skills** — full create/update/delete, backed by a new Postgres
   table via a new `api/src/modules/skills` module, global to the
   organization (visible in every project's Skills tab, not scoped to one
   project).
2. **Favorites** — a per-user, org-scoped favorite flag that applies to
   *both* system-scanned skills and custom (DB) skills.

## Goals

- Users can create, edit, and delete custom skills through the Skills tab UI.
- Custom skills are visible to every member of the organization, in every
  project.
- Any org member can create/edit/delete custom skills (no fine-grained
  permission gating for this iteration).
- Any org member can favorite/unfavorite any skill (system or custom) for
  themselves; favorites are server-synced (follow the user across devices)
  and pinned to the top of the list.
- Custom skills support the same "open in reader panel" and "send to agent
  session terminal" actions that system-scanned skills already support.

## Non-goals

- No permission-key gating for skill CRUD (`SKILLS_CREATE`/`EDIT`/`DELETE`
  are explicitly not introduced).
- No per-project scoping of custom skills.
- No change to how system skills are scanned, parsed, or cached — the
  scanner, parsers, and `SkillManager` are untouched other than getting a
  new IPC channel for sending a *non-file-backed* skill's text into a
  terminal.
- No handling for a system skill's underlying file moving/renaming beyond
  what already happens today (its id changes, and old favorites referencing
  the old id are simply orphaned — acceptable, consistent with the
  existing id scheme's guarantees).

## Data model

### `Skill` (new Prisma model, `api/prisma/schema.prisma`)

```prisma
model Skill {
  id              String       @id @default(uuid())
  organization_id String
  name            String
  description     String?
  body            String
  provider        SkillProvider @default(generic)
  kind            SkillKind     @default(skill)
  created_by      String
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt

  organization Organization @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@index([organization_id])
  @@map("skills")
}

enum SkillProvider {
  claude
  cursor
  codex
  gemini
  copilot
  generic
}

enum SkillKind {
  skill
  command
  rule
  context
  doc
}
```

`SkillProvider`/`SkillKind` mirror the existing app-side `SkillProvider`/
`SkillKind` string unions in `app/electron/shared/contract.ts` exactly, so
the same dropdown option lists (`app/src/config/constants/dropdowns/skills/skill.options.ts`)
drive both scanned-skill display and the custom-skill create/edit form.

There is no `scope` column — every row is implicitly `scope: "custom"` when
merged into the unified list on the frontend.

### `SkillFavorite` (new Prisma model)

```prisma
model SkillFavorite {
  id              String            @id @default(uuid())
  user_id         String
  organization_id String
  target_kind     SkillFavoriteKind
  ref_id          String
  created_at      DateTime          @default(now())

  user         User         @relation(fields: [user_id], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@unique([user_id, target_kind, ref_id])
  @@index([organization_id])
  @@map("skill_favorites")
}

enum SkillFavoriteKind {
  system
  custom
}
```

- `ref_id` holds either the custom `Skill.id` (uuid, when `target_kind = custom`)
  or the system-scanned skill's existing stable id
  (`sha1(resolved lowercase file path)`, when `target_kind = system`).
- No FK constraint from `ref_id` to `Skill.id` (it's polymorphic across a
  DB-backed and a non-DB-backed target), so referential integrity for the
  `custom` case is enforced in the service layer (deleting a `Skill` also
  deletes its `SkillFavorite` rows via an explicit query, since Prisma can't
  cascade a non-FK reference).

## Backend API (`api/src/modules/skills/`)

Mirrors the `projects` module's structure and conventions:

```
skills.module.ts
skills.controller.ts
skills.service.ts
dto/
  create-skill.dto.ts
  update-skill.dto.ts        # extends PartialType(CreateSkillDto)
  favorite-skill.dto.ts      # { target_kind: SkillFavoriteKind, ref_id: string }
entities/
  skill.entity.ts            # Swagger response shape
  skill-favorite.entity.ts
```

All routes behind `@UseGuards(JwtGuard, OrganizationGuard)`. Instead of
`@RequirePermissions(...)`, routes use `@OrgMemberOnly()` — any active member
of the organization may call them (per the "no gating" decision).

| Method | Path                    | Purpose                                         |
|--------|-------------------------|--------------------------------------------------|
| GET    | `/skills`               | List org's custom skills                         |
| GET    | `/skills/:id`           | Get one custom skill                             |
| POST   | `/skills`               | Create a custom skill                            |
| PATCH  | `/skills/:id`           | Update a custom skill                            |
| DELETE | `/skills/:id`           | Delete a custom skill (also purges its favorites) |
| GET    | `/skills/favorites`     | List the caller's favorite refs for this org      |
| POST   | `/skills/favorites`     | Add a favorite (`{ target_kind, ref_id }`)        |
| DELETE | `/skills/favorites/:id` | Remove a favorite by its own id                   |

`SkillsService` methods take `organizationId` as an explicit first parameter
and scope every query by it, exactly like `ProjectsService`. `create`/`update`
validate `name` (required, 1–120 chars) and `body` (required, capped — reuse
the existing 90 KB terminal-paste cap as the max stored body size to keep
"send to session" behavior consistent for custom skills).

`CreateSkillDto`: `name` (string, required), `description` (string, optional),
`body` (string, required), `provider` (enum `SkillProvider`, required),
`kind` (enum `SkillKind`, required) — class-validator decorators, `@ApiProperty`
on each field, following `create-project.dto.ts` conventions.

## Frontend

### Services & hooks (`app/src/features/skills/`)

`services/skills.services.ts` adds plain async wrappers around the new REST
endpoints (`listCustomSkills`, `getCustomSkill`, `createSkill`, `updateSkill`,
`deleteSkill`, `listFavorites`, `addFavorite`, `removeFavorite`), alongside
the existing IPC-bridge wrappers for scanned skills.

`hooks/use-skills.ts` adds:
- `useCustomSkills()` — `useQuery`, org-scoped.
- `useCreateSkill()`, `useUpdateSkill()`, `useDeleteSkill()` — `useMutation`,
  invalidate `["skills", "custom"]` + toast, matching `useCreateProject` etc.
- `useFavorites()` — `useQuery` for the caller's favorite refs.
- `useFavoriteSkill()` / `useUnfavoriteSkill()` — `useMutation`, optimistic
  toggle (like `useReorderProjects`'s optimistic pattern) since this is a
  frequent, low-risk toggle action; invalidate `["skills", "favorites"]`.
- `useSkills(projectId)` is extended to merge three sources — scanned
  skills (IPC, unchanged), custom skills (`useCustomSkills`), and favorites
  (`useFavorites`) — into one array of a unified shape:

```ts
interface UnifiedSkill extends SkillSummary {
  source: "system" | "custom";
  is_favorite: boolean;
}
```

  sorted with favorites first (stable sort, otherwise preserving each
  source's existing order).

### Skills tab UI

- Each row gets a star toggle icon calling `useFavoriteSkill`/
  `useUnfavoriteSkill`, available for both `source: "system"` and
  `source: "custom"` rows.
- A "New skill" button opens `skill-dialog.tsx` — one dialog handling both
  create and edit (mirrors `project-dialog.tsx`: `editing = data.find(...)`,
  conditional title/submit label), built with `react-hook-form` +
  `zodResolver` + a new `validation-schemas/skill.schema.ts`. Fields: name,
  description, body (multiline textarea), kind (`Select`, from
  `skill.options.ts`), provider (`Select`, from `skill.options.ts`).
- Custom-skill rows get a row menu (matching the existing row-action pattern)
  with Edit (opens `skill-dialog.tsx` pre-filled) and Delete (confirm dialog,
  then `useDeleteSkill`). System-scanned rows keep only the star — no
  edit/delete affordance, since they're read-only files.

### Reader panel & send-to-session parity

The reader panel and `SkillSendDialog` are extended to accept the unified
skill shape:
- `source: "system"` rows behave exactly as today (IPC `skills:read` /
  `skills:send` by id).
- `source: "custom"` rows already carry their full content from the list
  query, so the reader panel renders it directly (no extra fetch needed,
  though `GET /skills/:id` exists for a fresh read if ever needed).
  Sending adds one new IPC channel/bridge method, e.g. `skills:sendCustom`,
  taking `{ sessionId, mode, name, description, body }`; the main-process
  handler builds terminal text via the existing `buildSkillText` (from
  `app/electron/skills/skill-format.ts`) — reused as-is, not duplicated —
  and writes it to the target session's pty via `agentManager.write`,
  exactly like the existing `skills:send` handler does after its file read.

## Migration

New Prisma models are added to `api/prisma/schema.prisma`, then:

```
cd api && npm run migrate:local
```

(generates a migration under `.env.local`'s target DB and regenerates the
Prisma client). Per the project's own local-dev note, application testing
of the new endpoints should run against `.env.staging`
(`npm run start:staging`), not `.env.local`.

## Testing

- Backend: unit tests for `SkillsService` (create/update/delete scoping by
  org, favorite add/remove/list, delete-cascades-favorites) following the
  existing `projects.service.spec.ts` style if one exists, else Nest's
  standard testing module pattern.
- Frontend: extend `app/electron/skills/skills.test.ts`-style coverage is
  not applicable here (that file tests the scanner/parsers, which are
  unchanged); instead, hook-level tests for the merge logic in `use-skills.ts`
  (favorites-first sort, unified shape) if the app has an existing pattern
  for hook tests — otherwise this is verified manually through the UI.
- Manual: create/edit/delete a custom skill; favorite/unfavorite a system
  skill and a custom skill, confirm both persist and reorder to the top;
  send both a system and a custom skill into a live agent session terminal
  and confirm identical output.
