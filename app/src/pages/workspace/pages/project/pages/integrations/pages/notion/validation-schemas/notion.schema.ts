import { z } from "zod";

export const createNotionPageSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(2000),
  parent_id: z.string().min(1, "Choose a parent page"),
});
export type CreateNotionPageFormData = z.infer<typeof createNotionPageSchema>;
