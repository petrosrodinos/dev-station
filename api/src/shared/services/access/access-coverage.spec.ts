import 'reflect-metadata';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Reflector } from '@nestjs/core';
import { PermissionKey, SystemRoleKey } from 'generated/prisma';
import { PermissionCatalog, SystemRoles } from '@/shared/config/permissions';
import { readAccessRequirement } from '@/shared/decorators/access.decorator';
import { OrganizationGuard } from '@/shared/guards/organization.guard';
import { isProtected } from '@/shared/utils/access/access.utils';


const GUARDS_METADATA = '__guards__';
const PATH_METADATA = 'path';
const METHOD_METADATA = 'method';

const findControllerFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return findControllerFiles(full);
    return full.endsWith('.controller.ts') ? [full] : [];
  });

const controllerClasses = (): Function[] =>
  findControllerFiles(join(__dirname, '..', '..', '..', 'modules')).flatMap((file) =>
    Object.values(require(file)).filter(
      (exported): exported is Function =>
        typeof exported === 'function' &&
        Reflect.hasMetadata('path', exported) &&
        !Reflect.hasMetadata(METHOD_METADATA, exported),
    ),
  );

const usesOrganizationGuard = (cls: Function, handler: Function) =>
  [
    ...(Reflect.getMetadata(GUARDS_METADATA, cls) ?? []),
    ...(Reflect.getMetadata(GUARDS_METADATA, handler) ?? []),
  ].includes(OrganizationGuard);

describe('access coverage', () => {
  const reflector = new Reflector();

  it('finds controllers to audit', () => {
    expect(controllerClasses().length).toBeGreaterThan(0);
  });

  it('every route behind OrganizationGuard declares an access requirement', () => {
    const unprotected: string[] = [];

    for (const cls of controllerClasses()) {
      const proto = cls.prototype;
      for (const name of Object.getOwnPropertyNames(proto)) {
        const handler = proto[name];
        if (
          name === 'constructor' ||
          typeof handler !== 'function' ||
          !Reflect.hasMetadata(PATH_METADATA, handler) ||
          !Reflect.hasMetadata(METHOD_METADATA, handler)
        ) {
          continue;
        }
        if (!usesOrganizationGuard(cls, handler)) continue;

        const requirement = readAccessRequirement(reflector, { handler, cls });
        if (!isProtected(requirement)) unprotected.push(`${cls.name}.${name}`);
      }
    }

    expect(unprotected).toEqual([]);
  });
});

describe('permission catalog', () => {
  it('lists every PermissionKey exactly once', () => {
    const catalogKeys = PermissionCatalog.map((p) => p.key).sort();
    expect(catalogKeys).toEqual(Object.values(PermissionKey).sort());
  });

  it('gives each system role a unique rank and valid permissions', () => {
    const ranks = SystemRoles.map((r) => r.rank);
    expect(new Set(ranks).size).toBe(ranks.length);

    const valid = new Set<string>(Object.values(PermissionKey));
    for (const role of SystemRoles) {
      for (const permission of role.permissions) {
        expect(valid.has(permission)).toBe(true);
      }
    }
  });

  it('keeps Owner strictly the highest rank and holding every permission', () => {
    const owner = SystemRoles.find((r) => r.key === SystemRoleKey.OWNER);
    expect(Math.max(...SystemRoles.map((r) => r.rank))).toBe(owner.rank);
    expect(owner.permissions.slice().sort()).toEqual(
      Object.values(PermissionKey).sort(),
    );
  });
});
