import { AgentType } from 'generated/prisma';

/** Catalog of supported CLI coding agents. Add an entry (and a Prisma enum value) to support a new agent. */
export const AgentCatalog: {
  type: AgentType;
  name: string;
  default_executable: string;
  description: string;
  docs_url: string;
}[] = [
  {
    type: AgentType.CLAUDE_CODE,
    name: 'Claude Code',
    default_executable: 'claude',
    description: "Anthropic's agentic coding CLI",
    docs_url: 'https://docs.claude.com/en/docs/claude-code/overview',
  },
  {
    type: AgentType.CURSOR_CLI,
    name: 'Cursor CLI',
    default_executable: 'cursor-agent',
    description: "Cursor's terminal coding agent",
    docs_url: 'https://docs.cursor.com/en/cli/overview',
  },
];
