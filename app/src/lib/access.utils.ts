/**
 * Access rules behind every permission check in the app. A requirement is a single permission,
 * or `{ all }` / `{ any }` over several. The client only decides what to offer; the API is the
 * security boundary and enforces the same hierarchy rules.
 */
export type Requirement<P extends string = string> = P | { all: readonly P[] } | { any: readonly P[] };

export const satisfiesRequirement = <P extends string>(held: ReadonlySet<P>, requirement: Requirement<P>): boolean => {
    if (typeof requirement === "string") return held.has(requirement);
    if ("all" in requirement) return requirement.all.every((p) => held.has(p));
    return requirement.any.some((p) => held.has(p));
};

/** Config items (tabs, sections, palette entries…) may declare the permission they need. */
export interface AccessGated<P extends string = string> {
    permission?: Requirement<P>;
}

/** Keeps only the items the caller may see; items without a `permission` are always kept. */
export const filterByAccess = <P extends string, T extends AccessGated<P>>(items: readonly T[], can: (requirement: Requirement<P>) => boolean): T[] =>
    items.filter((item) => !item.permission || can(item.permission));

export interface AccessActor<P extends string = string> {
    user_id: string;
    rank: number;
    is_owner: boolean;
    permissions: ReadonlySet<P>;
}

const outranks = (actor: AccessActor, rank: number) => actor.is_owner || actor.rank > rank;

/** Roles the actor may hand out (assign or invite with). */
export const canAssignRole = (actor: AccessActor, role: { rank: number }) => outranks(actor, role.rank);

/** Members the actor may change or remove: never themselves, never at/above their rank. */
export const canModifyMember = (actor: AccessActor, member: { user_id: string; rank: number }) => member.user_id !== actor.user_id && outranks(actor, member.rank);

/** Roles the actor may edit or delete. */
export const canEditRole = (actor: AccessActor, role: { rank: number; key: string }, ownerKey: string) => role.key !== ownerKey && outranks(actor, role.rank);

/** Permissions the actor may put on a role: only ones they hold themselves. */
export const canGrantPermission = <P extends string>(actor: AccessActor<P>, permission: P) => actor.is_owner || actor.permissions.has(permission);
