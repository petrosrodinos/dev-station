import { ApiProperty } from '@nestjs/swagger';
import {
  AgentType,
  IntegrationProvider,
  RepositoryProvider,
  ServiceKind,
} from 'generated/prisma';

export class ProjectServiceEntity {
  @ApiProperty() id: string;
  @ApiProperty() project_id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ServiceKind }) kind: ServiceKind;
  @ApiProperty() cwd: string;
  @ApiProperty({ nullable: true }) package_manager: string | null;
  @ApiProperty({ nullable: true }) script: string | null;
  @ApiProperty({ nullable: true }) command: string | null;
  @ApiProperty({ nullable: true }) port: number | null;
  @ApiProperty({ nullable: true }) url: string | null;
  @ApiProperty({ nullable: true, type: Object }) env: unknown;
  @ApiProperty() auto_detected: boolean;
  @ApiProperty() sort_order: number;
}

export class RepositoryEntity {
  @ApiProperty() id: string;
  @ApiProperty({ enum: RepositoryProvider }) provider: RepositoryProvider;
  @ApiProperty() clone_url: string;
  @ApiProperty({ nullable: true }) full_name: string | null;
  @ApiProperty({ nullable: true }) default_branch: string | null;
  @ApiProperty({ nullable: true }) external_id: string | null;
  @ApiProperty({ nullable: true }) connection_id: string | null;
}

export class ProjectClientRef {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
}

export class ProjectEntity {
  @ApiProperty() id: string;
  @ApiProperty() organization_id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() color: string;
  @ApiProperty() sort_order: number;
  @ApiProperty({ nullable: true }) sub_path: string | null;
  @ApiProperty({ nullable: true, enum: AgentType })
  preferred_agent: AgentType | null;
  @ApiProperty({ nullable: true, type: ProjectClientRef })
  client: ProjectClientRef | null;
  @ApiProperty({ nullable: true, type: RepositoryEntity })
  repository: RepositoryEntity | null;
  @ApiProperty({ nullable: true }) github_connection_id: string | null;
  @ApiProperty({ nullable: true }) linear_connection_id: string | null;
  @ApiProperty({ nullable: true }) linear_team_id: string | null;
  @ApiProperty({ nullable: true }) linear_project_id: string | null;
  @ApiProperty({ nullable: true }) notion_connection_id: string | null;
  @ApiProperty({ nullable: true }) notion_root_page_id: string | null;
  @ApiProperty({ nullable: true }) last_activity_at: Date | null;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
  @ApiProperty({ type: ProjectServiceEntity, isArray: true })
  services: ProjectServiceEntity[];
}

export class ProjectIssueEntity {
  @ApiProperty() id: string;
  @ApiProperty() project_id: string;
  @ApiProperty({ enum: IntegrationProvider }) provider: IntegrationProvider;
  @ApiProperty() external_id: string;
  @ApiProperty({ nullable: true }) key: string | null;
  @ApiProperty({ nullable: true }) title: string | null;
  @ApiProperty() created_at: Date;
}
