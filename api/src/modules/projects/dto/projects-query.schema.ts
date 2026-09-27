import { z } from 'zod';

export const ProjectsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  client_id: z.string().uuid().optional(),
});

export type ProjectsQueryType = z.infer<typeof ProjectsQuerySchema>;
