import type { LinearIssue } from "@/features/integrations/interfaces/integrations.interfaces";

/** Builds the initial agent prompt from a Linear issue (Spec §17): title, description and context. */
export const buildIssuePrompt = (issue: LinearIssue, extraInstructions?: string): string => {
    const lines = [
        `You are working on Linear issue ${issue.identifier}: ${issue.title}`,
        "",
        issue.description?.trim() ? `Description:\n${issue.description.trim()}` : "No description was provided.",
    ];

    const meta = [
        issue.state ? `Status: ${issue.state.name}` : null,
        issue.priority_label ? `Priority: ${issue.priority_label}` : null,
        issue.labels.length ? `Labels: ${issue.labels.map((l) => l.name).join(", ")}` : null,
        issue.project ? `Linear project: ${issue.project.name}` : null,
        issue.url ? `Link: ${issue.url}` : null,
    ].filter(Boolean);
    if (meta.length) lines.push("", ...(meta as string[]));

    const comments = (issue.comments ?? []).slice(-5);
    if (comments.length) {
        lines.push("", "Recent comments:");
        for (const c of comments) lines.push(`- ${c.user?.name ?? "Someone"}: ${c.body.trim().replace(/\s+/g, " ").slice(0, 500)}`);
    }

    if (extraInstructions?.trim()) lines.push("", `Additional instructions:\n${extraInstructions.trim()}`);

    lines.push(
        "",
        "Implement the change in this repository. Do not commit or push — the developer will review the diff and commit.",
    );
    return lines.join("\n");
};

export const sessionNameFromPrompt = (prompt: string | null | undefined, fallback: string) => {
    const firstLine = prompt?.trim().split("\n")[0]?.trim();
    if (!firstLine) return fallback;
    return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
};
