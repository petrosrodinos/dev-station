import { z } from 'zod';

export const ProjectsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
});

export type ProjectsQueryType = z.infer<typeof ProjectsQuerySchema>;
