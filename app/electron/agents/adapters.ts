import os from "node:os";
import path from "node:path";
import type { AgentType } from "../shared/contract";
import { AgentRuntimeStatuses, AgentTypes } from "../shared/contract";
import type { AgentAdapter } from "./agent-adapter";

const claudeCode: AgentAdapter = {
  type: AgentTypes.CLAUDE_CODE,
  name: "Claude Code",
  defaultExecutable: "claude",
  buildArgs: (prompt) => (prompt ? [prompt] : []),
  resumeArgs: () => ["--continue"],
  sessionArgs: (sessionId, resume) => [resume ? "--resume" : "--session-id", sessionId],
  transcriptPath: (cwd, sessionId) => path.join(os.homedir(), ".claude", "projects", cwd.replace(/[^a-zA-Z0-9]/g, "-"), `${sessionId}.jsonl`),
  // Titles are re-emitted throughout the transcript, so the tail always has one. A /rename ("agent-name") beats the auto "ai-title".
  parseTitle: (tail) => {
    let aiTitle: string | null = null;
    const lines = tail.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const isName = line.includes('"type":"agent-name"');
      if (!isName && !line.includes('"type":"ai-title"')) continue;
      try {
        const entry = JSON.parse(line) as { agentName?: unknown; aiTitle?: unknown };
        if (isName && typeof entry.agentName === "string" && entry.agentName.trim()) return entry.agentName.trim();
        if (!isName && !aiTitle && typeof entry.aiTitle === "string" && entry.aiTitle.trim()) aiTitle = entry.aiTitle.trim();
      } catch {
        /* partial line at the start of the tail */
      }
    }
    return aiTitle;
  },
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
