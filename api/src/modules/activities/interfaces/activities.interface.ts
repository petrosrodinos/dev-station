import { ActivityType, Prisma } from 'generated/prisma';

export interface RecordActivityInput {
  organization_id: string;
  project_id?: string | null;
  user_id?: string | null;
  agent_session_id?: string | null;
  type: ActivityType;
  message: string;
  metadata?: Prisma.InputJsonValue;
}
