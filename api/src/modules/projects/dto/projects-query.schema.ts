import { z } from 'zod';

export const ProjectsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  /** Omitted or "false": active projects only. "true": archived projects only. */
  archived: z.enum(['true', 'false']).optional(),
});

export type ProjectsQueryType = z.infer<typeof ProjectsQuerySchema>;
