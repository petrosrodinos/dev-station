import type { AgentType } from "@shared/contract";
import type { AgentCommand } from "../interfaces/agent-commands.interfaces";

/** The saved default launch command for an agent type, if one is set. */
export const findDefaultCommand = (commands: AgentCommand[], agentType: AgentType) => commands.find((c) => c.agent_type === agentType && c.is_default);
