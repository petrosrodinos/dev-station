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
    default_branch: z.string().trim().min(1).max(100),
});
export type GitSettingsFormData = z.infer<typeof gitSettingsSchema>;

export const gitIdentitySchema = z.object({
    label: z.string().trim().min(1, "Label is required").max(60),
    name: z.string().trim().min(1, "Name is required").max(120),
    email: z.string().trim().email("Enter a valid email"),
});
export type GitIdentityFormData = z.infer<typeof gitIdentitySchema>;

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

export const changePasswordSchema = z
    .object({
        current_password: z.string().min(1, "Enter your current password"),
        new_password: z.string().min(8, "Password must be at least 8 characters long").max(72, "Password is too long"),
        confirm_password: z.string(),
    })
    .refine((d) => d.new_password === d.confirm_password, { message: "Passwords don't match.", path: ["confirm_password"] })
    .refine((d) => d.new_password !== d.current_password, { message: "New password must differ from the current one.", path: ["new_password"] });
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
