import type { AgentType } from "../shared/contract";
import { AgentRuntimeStatuses, AgentTypes } from "../shared/contract";
import type { AgentAdapter } from "./agent-adapter";

const claudeCode: AgentAdapter = {
  type: AgentTypes.CLAUDE_CODE,
  name: "Claude Code",
  defaultExecutable: "claude",
  buildArgs: (prompt) => (prompt ? [prompt] : []),
  resumeArgs: () => ["--continue"],
  // Claude Code shows "esc to interrupt" while it is working; its absence at the tail means it is waiting.
  inferStatus: (recent) => (/esc to interrupt/i.test(recent.slice(-600)) ? AgentRuntimeStatuses.RUNNING : null),
};

const cursorCli: AgentAdapter = {
  type: AgentTypes.CURSOR_CLI,
  name: "Cursor CLI",
  defaultExecutable: "cursor-agent",
  buildArgs: (prompt) => (prompt ? [prompt] : []),
  resumeArgs: () => ["resume"],
};

export const agentAdapters: Record<AgentType, AgentAdapter> = {
  [AgentTypes.CLAUDE_CODE]: claudeCode,
  [AgentTypes.CURSOR_CLI]: cursorCli,
};
