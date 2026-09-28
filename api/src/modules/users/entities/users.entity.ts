import { ApiProperty } from '@nestjs/swagger';
import {
  AgentType,
  AuthRole,
  PermissionKey,
  SystemRoleKey,
} from 'generated/prisma';
import { NotificationSettings } from '../constants/notification-settings.constants';

export class OrganizationRoleRef {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: SystemRoleKey }) key: SystemRoleKey;
}

export class OrganizationSummaryEntity {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ type: OrganizationRoleRef }) role: OrganizationRoleRef;
  @ApiProperty({ enum: PermissionKey, isArray: true })
  permissions: PermissionKey[];
}

export class MeEntity {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty({ nullable: true }) full_name: string | null;
  @ApiProperty({ nullable: true }) avatar_url: string | null;
  @ApiProperty({ enum: AuthRole }) role: AuthRole;
  @ApiProperty({ type: OrganizationSummaryEntity, isArray: true })
  organizations: OrganizationSummaryEntity[];
}

export class UserPreferenceEntity {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) active_organization_id: string | null;
  @ApiProperty({ enum: AgentType }) preferred_agent: AgentType;
  @ApiProperty() default_branch: string;
  @ApiProperty() idle_threshold_seconds: number;
  @ApiProperty() confirm_destructive: boolean;
  @ApiProperty() theme: string;
  @ApiProperty() theme_preset: string;
  @ApiProperty({ nullable: true }) accent_color: string | null;
  @ApiProperty() font_size: number;
  @ApiProperty() font_family: string;
  @ApiProperty() mono_font_family: string;
  @ApiProperty({
    description:
      'Resolved notification settings: { enabled, events: { [EVENT_TYPE]: { badge, feed, os } } }',
  })
  notification_settings: NotificationSettings;
}
