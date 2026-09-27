import { z } from "zod";

const serviceSchema = z
    .object({
        name: z.string().trim().min(1, "Name is required").max(120),
        kind: z.enum(["FRONTEND", "API", "WORKER", "DATABASE", "STORYBOOK", "OTHER"]),
        cwd: z
            .string()
            .trim()
            .max(500)
            .refine((v) => !v.includes("..") && !/^([a-zA-Z]:|[\\/])/.test(v), "Use a relative folder inside the project"),
        mode: z.enum(["script", "command"]),
        package_manager: z.enum(["npm", "pnpm", "yarn", "bun"]).optional(),
        script: z.string().trim().max(100).optional(),
        command: z.string().trim().max(2000).optional(),
        port: z.string().trim().regex(/^\d{0,5}$/, "Port must be a number").optional(),
        auto_detected: z.boolean().optional(),
    })
    .superRefine((s, ctx) => {
        if (s.mode === "script" && !s.script) ctx.addIssue({ code: "custom", path: ["script"], message: "Script is required" });
        if (s.mode === "command" && !s.command) ctx.addIssue({ code: "custom", path: ["command"], message: "Command is required" });
        if (s.command && /[\r\n]/.test(s.command)) ctx.addIssue({ code: "custom", path: ["command"], message: "Single-line commands only" });
    });

export const servicesFormSchema = z.object({ services: z.array(serviceSchema).max(50) });
export type ServicesFormData = z.infer<typeof servicesFormSchema>;
export type ServiceFormValue = ServicesFormData["services"][number];

export const commitSchema = z.object({
    message: z.string().trim().min(1, "Enter a commit message").max(20_000),
});
export type CommitFormData = z.infer<typeof commitSchema>;

export const branchSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Branch name is required")
        .max(200)
        // eslint-disable-next-line no-control-regex -- rejects control characters (git check-ref-format)
        .regex(/^(?!-)(?!.*\.\.)(?!.*[\s~^:?*[\\])(?!.*@\{)(?!.*\/\/)[^\x00-\x1f\x7f]+(?<![./])$/, "Not a valid branch name"),
    checkout: z.boolean(),
});
export type BranchFormData = z.infer<typeof branchSchema>;

export const linearSettingsSchema = z.object({
    linear_connection_id: z.string().optional(),
    linear_team_id: z.string().optional(),
    linear_project_id: z.string().optional(),
});
export type LinearSettingsFormData = z.infer<typeof linearSettingsSchema>;
