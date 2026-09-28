import { Prisma } from 'generated/prisma';

export const projectInclude = {
  repository: {
    select: {
      id: true,
      provider: true,
      clone_url: true,
      full_name: true,
      default_branch: true,
      external_id: true,
      connection_id: true,
    },
  },
  services: { orderBy: { sort_order: 'asc' } },
} satisfies Prisma.ProjectInclude;

export type ProjectView = Omit<
  Prisma.ProjectGetPayload<{ include: typeof projectInclude }>,
  'repository_id' | 'created_by'
>;
