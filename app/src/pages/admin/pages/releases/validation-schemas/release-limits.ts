import { z } from "zod";

export const ReleaseLimitsSchema = z.object({
    min_version: z.string().trim().max(30).optional(),
    release_notes: z.string().trim().max(2000).optional(),
});

export type ReleaseLimitsFormValues = z.infer<typeof ReleaseLimitsSchema>;
