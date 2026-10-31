import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ActivitiesService } from '@/modules/activities/activities.service';
import { SecretsCryptoService } from '@/shared/services/crypto/secrets-crypto.service';
import { ProjectSecretsService } from './project-secrets.service';

const ORG = 'org-1';
const PROJECT = 'project-1';
const USER = 'user-1';

type Row = Record<string, any>;

/** In-memory stand-in for the two Prisma delegates the service touches. */
function setup(options: { projectInOrg?: boolean } = {}) {
  const projectInOrg = options.projectInOrg ?? true;
  const rows = new Map<string, Row>();
  const matches = (row: Row, where: Row) =>
    Object.entries(where).every(([k, v]) => row[k] === v);

  const prisma = {
    project: {
      findFirst: jest.fn(async ({ where }: { where: Row }) =>
        projectInOrg && where.id === PROJECT && where.organization_id === ORG
          ? { id: PROJECT, name: 'Demo' }
          : null,
      ),
    },
    projectSecretSet: {
      findFirst: jest.fn(async ({ where }: { where: Row }) =>
        [...rows.values()].find((r) => matches(r, where)) ?? null,
      ),
      findMany: jest.fn(async ({ where }: { where: Row }) =>
        [...rows.values()].filter((r) => matches(r, where)),
      ),
      create: jest.fn(async ({ data }: { data: Row }) => {
        const row = {
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
          updater: { id: USER, email: 'a@b.c', full_name: 'A' },
        };
        rows.set(data.id, row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: Row; data: Row }) => {
        const defined = Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined),
        );
        const row = { ...rows.get(where.id), ...defined };
        rows.set(where.id, row);
        return row;
      }),
      delete: jest.fn(async ({ where }: { where: Row }) => {
        rows.delete(where.id);
      }),
    },
  };
  const activities = { record: jest.fn().mockResolvedValue({}) };
  const key = randomBytes(32).toString('base64');
  const crypto = new SecretsCryptoService({
    get: () => key,
  } as unknown as ConfigService);

  const service = new ProjectSecretsService(
    prisma as unknown as PrismaService,
    crypto,
    activities as unknown as ActivitiesService,
  );
  return { service, prisma, rows, activities };
}

const dto = (overrides: Record<string, unknown> = {}) =>
  ({
    name: 'api .env',
    variables: [
      { key: 'DATABASE_URL', value: 'postgres://user:pw@host/db' },
      { key: 'API_KEY', value: 'sk-live-123' },
    ],
    ...overrides,
  }) as never;

describe('ProjectSecretsService', () => {
  it('stores only ciphertext and returns the variables to the caller', async () => {
    const { service, rows } = setup();

    const created = await service.create(ORG, PROJECT, USER, dto());

    expect(created.variables).toEqual([
      { key: 'DATABASE_URL', value: 'postgres://user:pw@host/db' },
      { key: 'API_KEY', value: 'sk-live-123' },
    ]);
    const stored = JSON.stringify([...rows.values()]);
    for (const secret of ['postgres://', 'sk-live-123', 'DATABASE_URL', 'API_KEY']) {
      expect(stored).not.toContain(secret);
    }
    expect([...rows.values()][0].variable_count).toBe(2);
  });

  it('decrypts what was stored on read', async () => {
    const { service } = setup();
    const created = await service.create(ORG, PROJECT, USER, dto());

    const read = await service.findOne(ORG, PROJECT, created.id);

    expect(read.variables).toEqual(created.variables);
  });

  it('lists sets without values', async () => {
    const { service } = setup();
    await service.create(ORG, PROJECT, USER, dto());

    const [summary] = await service.findAll(ORG, PROJECT);

    expect(summary).toMatchObject({ name: 'api .env', variable_count: 2 });
    expect(summary).not.toHaveProperty('variables');
    expect(summary).not.toHaveProperty('payload');
  });

  it('re-encrypts with a fresh payload on update and keeps the count in sync', async () => {
    const { service, rows } = setup();
    const created = await service.create(ORG, PROJECT, USER, dto());
    const before = rows.get(created.id).payload;

    const updated = await service.update(ORG, PROJECT, created.id, USER, {
      variables: [{ key: 'ONLY', value: 'one' }],
    } as never);

    expect(updated.variables).toEqual([{ key: 'ONLY', value: 'one' }]);
    expect(rows.get(created.id).payload).not.toBe(before);
    expect(rows.get(created.id).variable_count).toBe(1);
    expect((await service.findOne(ORG, PROJECT, created.id)).variables).toEqual(
      updated.variables,
    );
  });

  it('keeps the existing values when an update only renames the set', async () => {
    const { service } = setup();
    const created = await service.create(ORG, PROJECT, USER, dto());

    const renamed = await service.update(ORG, PROJECT, created.id, USER, {
      name: 'staging',
    } as never);

    expect(renamed.name).toBe('staging');
    expect(renamed.variables).toEqual(created.variables);
  });

  it('rejects a duplicate set name in the same project', async () => {
    const { service } = setup();
    await service.create(ORG, PROJECT, USER, dto());

    await expect(service.create(ORG, PROJECT, USER, dto())).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects duplicate variable names', async () => {
    const { service } = setup();

    await expect(
      service.create(
        ORG,
        PROJECT,
        USER,
        dto({
          variables: [
            { key: 'A', value: '1' },
            { key: ' A ', value: '2' },
          ],
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('treats a project outside the organization as not found', async () => {
    const { service } = setup({ projectInOrg: false });

    await expect(service.findAll(ORG, PROJECT)).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.create(ORG, PROJECT, USER, dto())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('does not expose a set through another organization or project', async () => {
    const { service } = setup();
    const created = await service.create(ORG, PROJECT, USER, dto());

    await expect(
      service.findOne('org-2', PROJECT, created.id),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.findOne(ORG, 'project-2', created.id),
    ).rejects.toThrow(NotFoundException);
  });

  it('deletes a set', async () => {
    const { service, rows } = setup();
    const created = await service.create(ORG, PROJECT, USER, dto());

    await service.remove(ORG, PROJECT, created.id, USER);

    expect(rows.size).toBe(0);
    await expect(service.findOne(ORG, PROJECT, created.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('records activity with the set name but never any value', async () => {
    const { service, activities } = setup();
    await service.create(ORG, PROJECT, USER, dto());
    await new Promise((resolve) => setImmediate(resolve));

    expect(activities.record).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(activities.record.mock.calls);
    expect(logged).toContain('api .env');
    expect(logged).not.toContain('sk-live-123');
    expect(logged).not.toContain('postgres://');
  });
});
