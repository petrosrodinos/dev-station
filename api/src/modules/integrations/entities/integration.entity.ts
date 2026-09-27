import { ApiProperty } from '@nestjs/swagger';
import { ConnectionStatus, IntegrationProvider } from 'generated/prisma';

export class ConnectionUserEntity {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) full_name: string | null;
  @ApiProperty() email: string;
}

export class ConnectionEntity {
  @ApiProperty() id: string;
  @ApiProperty({ enum: IntegrationProvider }) provider: IntegrationProvider;
  @ApiProperty() label: string;
  @ApiProperty({ nullable: true }) external_account: string | null;
  @ApiProperty({ enum: ConnectionStatus }) status: ConnectionStatus;
  @ApiProperty() is_default: boolean;
  @ApiProperty({ nullable: true }) last_error: string | null;
  @ApiProperty() created_at: Date;
  @ApiProperty({ type: ConnectionUserEntity }) user: ConnectionUserEntity;
}

export class IntegrationEntity {
  @ApiProperty({ enum: IntegrationProvider }) provider: IntegrationProvider;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty({
    description: 'False when Composio is not configured on the server',
  })
  available: boolean;
  @ApiProperty({ description: 'False for catalog entries not implemented yet' })
  supported: boolean;
  @ApiProperty({ type: String, isArray: true }) capabilities: string[];
  @ApiProperty({ type: ConnectionEntity, isArray: true })
  connections: ConnectionEntity[];
}

export class InitiatedConnectionEntity {
  @ApiProperty({ type: ConnectionEntity }) connection: ConnectionEntity;
  @ApiProperty({
    nullable: true,
    description: 'Open in the system browser to finish OAuth',
  })
  redirect_url: string | null;
}

export class GithubRepositoryEntity {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() full_name: string;
  @ApiProperty() clone_url: string;
  @ApiProperty({ nullable: true }) ssh_url: string | null;
  @ApiProperty({ nullable: true }) default_branch: string | null;
  @ApiProperty() private: boolean;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ nullable: true }) updated_at: string | null;
}

export class LinearTeamEntity {
  @ApiProperty() id: string;
  @ApiProperty() key: string;
  @ApiProperty() name: string;
}

export class LinearProjectEntity {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) state: string | null;
}

export class NotionPageEntity {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) url: string | null;
  @ApiProperty({ nullable: true }) last_edited_time: string | null;
  @ApiProperty() object: string;
}

export class NotionPageContentEntity {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) url: string | null;
  @ApiProperty() markdown: string;
}
