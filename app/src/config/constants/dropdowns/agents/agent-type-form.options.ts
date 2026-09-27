import { AgentTypes, type AgentType } from "@shared/contract";

export const AgentTypeFormOptions: { id: AgentType; label: string }[] = [
    { id: AgentTypes.CLAUDE_CODE, label: "Claude Code" },
    { id: AgentTypes.CURSOR_CLI, label: "Cursor CLI" },
];

export function getAgentTypeLabel(type: AgentType | string | null | undefined): string {
    return AgentTypeFormOptions.find((o) => o.id === type)?.label ?? String(type ?? "");
}
