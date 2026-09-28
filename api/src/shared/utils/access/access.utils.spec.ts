import { AccessActor, DenialCodes } from '@/shared/interfaces/access.interface';
import {
  canAssignRole,
  canCreateRole,
  canEditRole,
  canGrantPermissions,
  canModifyMember,
  isProtected,
  satisfies,
} from './access.utils';

const actor = (over: Partial<AccessActor> = {}): AccessActor => ({
  member_id: 'me',
  permissions: new Set(['A', 'B']),
  rank: 80,
  is_owner: false,
  ...over,
});
const owner = actor({ rank: 100, is_owner: true, permissions: new Set(['A', 'B', 'C']) });

describe('satisfies', () => {
  it('requires every permission in `all`', () => {
    expect(satisfies(actor(), { all: ['A', 'B'] }).allowed).toBe(true);
    const d = satisfies(actor(), { all: ['A', 'C'] });
    expect(d).toMatchObject({ allowed: false, code: DenialCodes.MISSING_PERMISSION });
  });

  it('requires at least one permission in `any`', () => {
    expect(satisfies(actor(), { any: ['X', 'B'] }).allowed).toBe(true);
    expect(satisfies(actor(), { any: ['X', 'Y'] }).allowed).toBe(false);
  });

  it('enforces owner_only', () => {
    expect(satisfies(actor(), { owner_only: true })).toMatchObject({
      allowed: false,
      code: DenialCodes.OWNER_ONLY,
    });
    expect(satisfies(owner, { owner_only: true }).allowed).toBe(true);
  });

  it('member_only passes any actor', () => {
    expect(satisfies(actor({ permissions: new Set() }), { member_only: true }).allowed).toBe(true);
  });
});

describe('isProtected', () => {
  it('is false for an empty requirement', () => {
    expect(isProtected({})).toBe(false);
    expect(isProtected({ all: [] })).toBe(false);
  });
  it('is true when any rule is declared', () => {
    expect(isProtected({ all: ['A'] })).toBe(true);
    expect(isProtected({ any: ['A'] })).toBe(true);
    expect(isProtected({ owner_only: true })).toBe(true);
    expect(isProtected({ member_only: true })).toBe(true);
  });
});

describe('canAssignRole', () => {
  it('allows only strictly lower ranks', () => {
    expect(canAssignRole(actor(), { rank: 60 }).allowed).toBe(true);
    expect(canAssignRole(actor(), { rank: 80 }).allowed).toBe(false);
    expect(canAssignRole(actor(), { rank: 100 }).allowed).toBe(false);
  });
  it('lets owners assign any rank including their own', () => {
    expect(canAssignRole(owner, { rank: 100 }).allowed).toBe(true);
  });
});

describe('canModifyMember', () => {
  it('blocks self modification, even for owners', () => {
    expect(canModifyMember(owner, { member_id: 'me', rank: 100 })).toMatchObject({
      code: DenialCodes.SELF_MODIFICATION,
    });
  });
  it('blocks members at or above own rank', () => {
    expect(canModifyMember(actor(), { member_id: 'x', rank: 80 }).allowed).toBe(false);
    expect(canModifyMember(actor(), { member_id: 'x', rank: 100 }).allowed).toBe(false);
    expect(canModifyMember(actor(), { member_id: 'x', rank: 40 }).allowed).toBe(true);
  });
  it('lets owners manage other owners', () => {
    expect(canModifyMember(owner, { member_id: 'x', rank: 100 }).allowed).toBe(true);
  });
});

describe('canGrantPermissions', () => {
  it('allows a subset of own permissions', () => {
    expect(canGrantPermissions(actor(), ['A']).allowed).toBe(true);
  });
  it('rejects permissions the actor lacks', () => {
    expect(canGrantPermissions(actor(), ['A', 'C'])).toMatchObject({
      code: DenialCodes.GRANT_EXCEEDS_OWN,
    });
  });
  it('lets owners grant anything', () => {
    expect(canGrantPermissions(owner, ['Z']).allowed).toBe(true);
  });
});

describe('canCreateRole', () => {
  it('requires a rank strictly below the actor', () => {
    expect(canCreateRole(actor(), 79).allowed).toBe(true);
    expect(canCreateRole(actor(), 80).allowed).toBe(false);
    expect(canCreateRole(owner, 100).allowed).toBe(false);
    expect(canCreateRole(owner, 99).allowed).toBe(true);
  });
});

describe('canEditRole', () => {
  it('rejects immutable roles for everyone', () => {
    expect(canEditRole(owner, { rank: 100, immutable: true }, [], undefined)).toMatchObject({
      code: DenialCodes.IMMUTABLE_ROLE,
    });
  });
  it('rejects roles at or above own rank', () => {
    expect(canEditRole(actor(), { rank: 80 }, ['A'], ['A']).allowed).toBe(false);
  });
  it('only checks newly added permissions against the actor', () => {
    const role = { rank: 40 };
    expect(canEditRole(actor(), role, ['C'], ['C']).allowed).toBe(true);
    expect(canEditRole(actor(), role, [], ['C']).allowed).toBe(false);
    expect(canEditRole(actor(), role, ['C', 'A'], ['A']).allowed).toBe(true);
  });
});
