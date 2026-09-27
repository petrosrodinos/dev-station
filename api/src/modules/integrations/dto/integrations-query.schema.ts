import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => v === 'true' || v === '1');

export const GithubRepositoriesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(1, parseInt(v, 10) || 1) : 1)),
});
export type GithubRepositoriesQueryType = z.infer<
  typeof GithubRepositoriesQuerySchema
>;

export const LinearProjectsQuerySchema = z.object({
  team_id: z.string().max(100).optional(),
});
export type LinearProjectsQueryType = z.infer<typeof LinearProjectsQuerySchema>;

export const LinearIssuesQuerySchema = z.object({
  team_id: z.string().max(100).optional(),
  project_id: z.string().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  include_completed: booleanString,
});
export type LinearIssuesQueryType = z.infer<typeof LinearIssuesQuerySchema>;

export const NotionPagesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
});
export type NotionPagesQueryType = z.infer<typeof NotionPagesQuerySchema>;
