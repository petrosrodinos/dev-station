import { z } from "zod";

const serviceSchema = z
    .object({
        /** Existing service id; sent back on save so running processes stay attached. */
        id: z.string().optional(),
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
        env: z.array(z.object({ key: z.string().trim().max(120), value: z.string().max(2000) })).max(50),
        auto_detected: z.boolean().optional(),
    })
    .superRefine((s, ctx) => {
        if (s.mode === "script" && !s.script) ctx.addIssue({ code: "custom", path: ["script"], message: "Script is required" });
        if (s.mode === "command" && !s.command) ctx.addIssue({ code: "custom", path: ["command"], message: "Command is required" });
        if (s.command && /[\r\n]/.test(s.command)) ctx.addIssue({ code: "custom", path: ["command"], message: "Single-line commands only" });
        const seen = new Set<string>();
        s.env.forEach((row, i) => {
            if (!row.key && !row.value) return;
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(row.key)) ctx.addIssue({ code: "custom", path: ["env", i, "key"], message: "Letters, digits and _ only" });
            else if (seen.has(row.key)) ctx.addIssue({ code: "custom", path: ["env", i, "key"], message: "Duplicate variable" });
            seen.add(row.key);
        });
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

export const renameBranchSchema = branchSchema.pick({ name: true });
export type RenameBranchFormData = z.infer<typeof renameBranchSchema>;

export const RemoteModes = { CREATE: "create", EXISTING: "existing", URL: "url" } as const;
export type RemoteMode = (typeof RemoteModes)[keyof typeof RemoteModes];

export const remoteSchema = z
    .object({
        mode: z.enum([RemoteModes.CREATE, RemoteModes.EXISTING, RemoteModes.URL]),
        connection_id: z.string().optional(),
        name: z.string().trim().optional(),
        description: z.string().trim().max(350).optional(),
        owner: z.string().trim().optional(),
        is_private: z.boolean(),
        existing_full_name: z.string().optional(),
        url: z.string().trim().optional(),
        branch_name: z.string().trim().optional(),
    })
    .superRefine((data, ctx) => {
        const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
        // eslint-disable-next-line no-control-regex -- rejects control characters (git check-ref-format)
        if (data.branch_name && !/^(?!-)(?!.*\.\.)(?!.*[\s~^:?*[\\])(?!.*@\{)(?!.*\/\/)[^\x00-\x1f\x7f]+(?<![./])$/.test(data.branch_name)) fail("branch_name", "Not a valid branch name");
        if (data.mode !== RemoteModes.URL && !data.connection_id) fail("connection_id", "Choose a GitHub account");
        if (data.mode === RemoteModes.CREATE) {
            if (!data.name || !/^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/.test(data.name)) fail("name", "Use letters, numbers, '.', '-' or '_' (max 100)");
            if (data.owner && !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(data.owner)) fail("owner", "Not a valid GitHub user or organization");
        }
        if (data.mode === RemoteModes.EXISTING && !data.existing_full_name) fail("existing_full_name", "Pick a repository");
        if (data.mode === RemoteModes.URL && !/^(https:\/\/[^\s/]+\/\S+|ssh:\/\/\S+|git@[^\s:]+:\S+)$/i.test(data.url ?? "")) fail("url", "Enter an https://, ssh:// or git@host:path URL");
    });
export type RemoteFormData = z.infer<typeof remoteSchema>;

export const linearSettingsSchema =z.object({
    linear_connection_id: z.string().optional(),
    linear_team_id: z.string().optional(),
    linear_project_id: z.string().optional(),
});
export type LinearSettingsFormData = z.infer<typeof linearSettingsSchema>;
