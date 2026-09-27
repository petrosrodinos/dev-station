import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from 'generated/prisma';

export class ActivityUserEntity {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty({ nullable: true }) full_name: string | null;
}

export class ActivityEntity {
  @ApiProperty() id: string;
  @ApiProperty() organization_id: string;
  @ApiProperty({ nullable: true }) project_id: string | null;
  @ApiProperty({ nullable: true }) agent_session_id: string | null;
  @ApiProperty({ enum: ActivityType }) type: ActivityType;
  @ApiProperty() message: string;
  @ApiProperty({ nullable: true, type: Object }) metadata: unknown;
  @ApiProperty({ type: ActivityUserEntity, nullable: true })
  user: ActivityUserEntity | null;
  @ApiProperty() created_at: Date;
}
