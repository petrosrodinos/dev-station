import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ActivitiesService } from '@/modules/activities/activities.service';
import { ProjectsService } from './projects.service';

const PROJECT_ID = 'project-1';

/** Minimal Prisma double: only the calls replaceServices makes. */
function setup(existingServiceIds: string[]) {
  const tx = {
    projectService: {
      findMany: jest
        .fn()
        .mockResolvedValue(existingServiceIds.map((id) => ({ id }))),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    project: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: PROJECT_ID, name: 'Demo', services: [] }),
    },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  };
  const service = new ProjectsService(
    prisma as unknown as PrismaService,
    {} as ActivitiesService,
  );
  return { service, tx };
}

const input = (overrides: Record<string, unknown>) => ({
  name: 'Web',
  kind: 'FRONTEND',
  cwd: 'apps/web',
  script: 'dev',
  port: 3000,
  ...overrides,
});

describe('ProjectsService.replaceServices', () => {
  it('keeps the id of a service that is still in the list and creates the new one', async () => {
    const { service, tx } = setup(['svc-web', 'svc-api']);

    await service.replaceServices('org-1', PROJECT_ID, [
      input({ id: 'svc-web' }),
      input({ name: 'New' }),
    ] as never);

    expect(tx.projectService.deleteMany).toHaveBeenCalledWith({
      where: { project_id: PROJECT_ID, id: { notIn: ['svc-web'] } },
    });
    expect(tx.projectService.update).toHaveBeenCalledTimes(1);
    expect(tx.projectService.update).toHaveBeenCalledWith({
      where: { id: 'svc-web' },
      data: expect.objectContaining({ name: 'Web', sort_order: 0 }),
    });
    expect(tx.projectService.create).toHaveBeenCalledTimes(1);
    expect(tx.projectService.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'New',
        sort_order: 1,
        project_id: PROJECT_ID,
      }),
    });
  });

  it('does not reattach to a service id that belongs to another project', async () => {
    const { service, tx } = setup(['svc-web']);

    await service.replaceServices('org-1', PROJECT_ID, [
      input({ id: 'svc-from-elsewhere' }),
    ] as never);

    expect(tx.projectService.deleteMany).toHaveBeenCalledWith({
      where: { project_id: PROJECT_ID },
    });
    expect(tx.projectService.update).not.toHaveBeenCalled();
    expect(tx.projectService.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ project_id: PROJECT_ID }),
    });
  });

  it('updates a repeated id only once and creates the duplicate', async () => {
    const { service, tx } = setup(['svc-web']);

    await service.replaceServices('org-1', PROJECT_ID, [
      input({ id: 'svc-web' }),
      input({ id: 'svc-web', name: 'Copy' }),
    ] as never);

    expect(tx.projectService.update).toHaveBeenCalledTimes(1);
    expect(tx.projectService.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Copy', project_id: PROJECT_ID }),
    });
  });
});
