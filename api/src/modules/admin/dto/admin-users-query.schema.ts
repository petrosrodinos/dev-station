import { z } from 'zod';
import { AuthRole } from 'generated/prisma';

export const AdminUsersQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  role: z.nativeEnum(AuthRole).optional(),
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

export type AdminUsersQueryType = z.infer<typeof AdminUsersQuerySchema>;
