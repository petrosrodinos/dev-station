import type { AgentType } from "@shared/contract";

export interface AgentCommand {
    id: string;
    name: string;
    agent_type: AgentType;
    /** Full command line: the executable followed by its flags. Quotes group arguments containing spaces. */
    command: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateAgentCommandDto {
    name: string;
    agent_type: AgentType;
    command: string;
    is_default?: boolean;
}

export type UpdateAgentCommandDto = Partial<CreateAgentCommandDto>;
