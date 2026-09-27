import { ActivityType, AgentSessionStatus } from 'generated/prisma';

/** Activity recorded when a session enters a status, and the verb used in its message. */
export const SessionStatusActivity: Partial<
  Record<AgentSessionStatus, { type: ActivityType; verb: string }>
> = {
  [AgentSessionStatus.AWAITING_INPUT]: {
    type: ActivityType.AGENT_AWAITING_INPUT,
    verb: 'is awaiting input',
  },
  [AgentSessionStatus.FINISHED]: {
    type: ActivityType.AGENT_FINISHED,
    verb: 'finished — awaiting review',
  },
  [AgentSessionStatus.CRASHED]: {
    type: ActivityType.AGENT_CRASHED,
    verb: 'crashed',
  },
  [AgentSessionStatus.STOPPED]: {
    type: ActivityType.AGENT_STOPPED,
    verb: 'was stopped',
  },
};

export const TerminalSessionStatuses: AgentSessionStatus[] = [
  AgentSessionStatus.FINISHED,
  AgentSessionStatus.CRASHED,
  AgentSessionStatus.STOPPED,
];
