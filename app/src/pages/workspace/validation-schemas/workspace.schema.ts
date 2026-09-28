import { z } from "zod";

export const createOrganizationSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
});
export type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;

export const newSessionSchema = z.object({
    project_id: z.string().min(1, "Choose a project"),
    agent_type: z.enum(["CLAUDE_CODE", "CURSOR_CLI"]),
    name: z.string().trim().max(120).optional(),
    prompt: z.string().max(50_000).optional(),
});
export type NewSessionFormData = z.infer<typeof newSessionSchema>;

const cloneUrl = z
    .string()
    .trim()
    .regex(/^(https:\/\/|ssh:\/\/|git@[\w.-]+:)\S+$/, "Use an https:// or SSH (git@host:org/repo.git) URL");

export const ProjectSources = {
    GITHUB: "github",
    URL: "url",
    FOLDER: "folder",
    NONE: "none",
} as const;
export type ProjectSource = (typeof ProjectSources)[keyof typeof ProjectSources];

export const projectFormSchema = z
    .object({
        source: z.enum(["github", "url", "folder", "none"]),
        name: z.string().trim().min(1, "Project name is required").max(120),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        description: z.string().max(1000).optional(),
        github_connection_id: z.string().optional(),
        github_repo_full_name: z.string().optional(),
        clone_url: z.string().optional(),
        default_branch: z.string().optional(),
        destination: z.string().optional(),
        local_path: z.string().optional(),
        sub_path: z.string().trim().max(500).optional(),
    })
    .superRefine((data, ctx) => {
        if (data.source === "github" && !data.github_repo_full_name) {
            ctx.addIssue({ code: "custom", path: ["github_repo_full_name"], message: "Choose a repository" });
        }
        if (data.source === "url") {
            const parsed = cloneUrl.safeParse(data.clone_url ?? "");
            if (!parsed.success) ctx.addIssue({ code: "custom", path: ["clone_url"], message: parsed.error.issues[0]?.message ?? "Invalid URL" });
        }
        if ((data.source === "github" || data.source === "url") && !data.destination) {
            ctx.addIssue({ code: "custom", path: ["destination"], message: "Choose where to clone the repository" });
        }
        if (data.source === "folder" && !data.local_path) {
            ctx.addIssue({ code: "custom", path: ["local_path"], message: "Choose the project folder" });
        }
        if (data.sub_path && (data.sub_path.includes("..") || /^([a-zA-Z]:|[\\/])/.test(data.sub_path))) {
            ctx.addIssue({ code: "custom", path: ["sub_path"], message: "Use a relative path inside the repository" });
        }
    });
export type ProjectFormData = z.infer<typeof projectFormSchema>;
