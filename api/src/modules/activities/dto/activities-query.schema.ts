import { z } from 'zod';

export const ActivitiesQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(1, parseInt(v, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) =>
      v ? Math.min(100, Math.max(1, parseInt(v, 10) || 30)) : 30,
    ),
});

export type ActivitiesQueryType = z.infer<typeof ActivitiesQuerySchema>;
