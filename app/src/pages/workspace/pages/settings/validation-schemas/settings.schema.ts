import { z } from "zod";

const optionalPath = z.string().trim().max(1000).optional();

export const deviceSettingsSchema = z.object({
    workspace_dir: z.string().trim().min(1, "Choose a workspace folder").max(1000),
    default_shell: optionalPath,
    cursor_path: optionalPath,
    vscode_path: optionalPath,
});
export type DeviceSettingsFormData = z.infer<typeof deviceSettingsSchema>;

export const gitSettingsSchema = z.object({
    git_name: z.string().trim().max(200).optional(),
    git_email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
    default_branch: z.string().trim().min(1).max(100),
});
export type GitSettingsFormData = z.infer<typeof gitSettingsSchema>;

export const aiSettingsSchema = z.object({
    preferred_agent: z.enum(["CLAUDE_CODE", "CURSOR_CLI"]),
    idle_threshold_seconds: z.string().regex(/^\d+$/),
    claude_path: optionalPath,
    cursor_agent_path: optionalPath,
});
export type AiSettingsFormData = z.infer<typeof aiSettingsSchema>;

export const accountSchema = z.object({
    full_name: z.string().trim().min(1, "Name is required").max(120),
});
export type AccountFormData = z.infer<typeof accountSchema>;
