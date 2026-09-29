import { z } from "zod";
import { SkillKinds, SkillProviders } from "@shared/contract";

export const skillFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
    description: z.string().trim().max(500).optional(),
    body: z.string().trim().min(1, "Content is required").max(90_000),
    provider: z.enum([SkillProviders.CLAUDE, SkillProviders.CURSOR, SkillProviders.CODEX, SkillProviders.GEMINI, SkillProviders.COPILOT, SkillProviders.GENERIC]),
    kind: z.enum([SkillKinds.SKILL, SkillKinds.COMMAND, SkillKinds.RULE, SkillKinds.CONTEXT, SkillKinds.DOC]),
    is_public: z.boolean(),
});

export type SkillFormData = z.infer<typeof skillFormSchema>;
