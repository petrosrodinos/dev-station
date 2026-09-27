import { ApiProperty } from '@nestjs/swagger';
import {
  AgentSessionStatus,
  AgentType,
  IntegrationProvider,
} from 'generated/prisma';

export class AgentSessionEntity {
  @ApiProperty() id: string;
  @ApiProperty() organization_id: string;
  @ApiProperty() project_id: string;
  @ApiProperty() user_id: string;
  @ApiProperty({ enum: AgentType }) agent_type: AgentType;
  @ApiProperty() name: string;
  @ApiProperty({ enum: AgentSessionStatus }) status: AgentSessionStatus;
  @ApiProperty({ nullable: true }) initial_prompt: string | null;
  @ApiProperty({ nullable: true }) device_id: string | null;
  @ApiProperty({ nullable: true, enum: IntegrationProvider })
  issue_provider: IntegrationProvider | null;
  @ApiProperty({ nullable: true }) issue_external_id: string | null;
  @ApiProperty({ nullable: true }) issue_key: string | null;
  @ApiProperty({ nullable: true }) issue_title: string | null;
  @ApiProperty() files_changed: number;
  @ApiProperty() additions: number;
  @ApiProperty() deletions: number;
  @ApiProperty({ nullable: true }) commit_sha: string | null;
  @ApiProperty({ nullable: true }) exit_code: number | null;
  @ApiProperty() started_at: Date;
  @ApiProperty({ nullable: true }) ended_at: Date | null;
  @ApiProperty() updated_at: Date;
}
