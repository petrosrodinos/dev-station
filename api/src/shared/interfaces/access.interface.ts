export interface AccessActor<P extends string = string> {
  /** Id of the actor's membership record (used to detect self-modification). */
  member_id: string;
  permissions: ReadonlySet<P>;
  /** Higher rank = more authority. Only strictly lower ranks can be managed. */
  rank: number;
  /** Owners sit above the rank ladder: they may act on their own rank and hold every grant. */
  is_owner: boolean;
}

export interface AccessRequirement<P extends string = string> {
  all?: readonly P[];
  any?: readonly P[];
  owner_only?: boolean;
  member_only?: boolean;
}

export const DenialCodes = {
  MISSING_PERMISSION: 'MISSING_PERMISSION',
  OWNER_ONLY: 'OWNER_ONLY',
  RANK_TOO_LOW: 'RANK_TOO_LOW',
  GRANT_EXCEEDS_OWN: 'GRANT_EXCEEDS_OWN',
  SELF_MODIFICATION: 'SELF_MODIFICATION',
  IMMUTABLE_ROLE: 'IMMUTABLE_ROLE',
} as const;
export type DenialCode = (typeof DenialCodes)[keyof typeof DenialCodes];

export interface AccessDecision {
  allowed: boolean;
  code?: DenialCode;
  reason?: string;
}

export interface RoleTarget {
  rank: number;
  /** Roles that can never be edited (e.g. Owner). */
  immutable?: boolean;
}

export interface MemberTarget {
  member_id: string;
  rank: number;
}
