import { z } from 'zod';
import { AgentSessionStatus } from 'generated/prisma';

export const AgentSessionsQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  status: z.nativeEnum(AgentSessionStatus).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(1, parseInt(v, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) =>
      v ? Math.min(100, Math.max(1, parseInt(v, 10) || 20)) : 20,
    ),
});

export type AgentSessionsQueryType = z.infer<typeof AgentSessionsQuerySchema>;
