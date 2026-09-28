import { ApiProperty } from '@nestjs/swagger';
import { MemberStatus, PermissionKey, SystemRoleKey } from 'generated/prisma';
import { OrganizationRoleRef } from '@/modules/users/entities/users.entity';

export class MemberUserEntity {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty({ nullable: true }) full_name: string | null;
  @ApiProperty({ nullable: true }) avatar_url: string | null;
}

export class OrganizationMemberEntity {
  @ApiProperty() id: string;
  @ApiProperty({ type: MemberUserEntity }) user: MemberUserEntity;
  @ApiProperty({ type: OrganizationRoleRef }) role: OrganizationRoleRef;
  @ApiProperty({ enum: MemberStatus }) status: MemberStatus;
  @ApiProperty() joined_at: Date;
}

export class RoleEntity {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: SystemRoleKey }) key: SystemRoleKey;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() is_system: boolean;
  @ApiProperty() rank: number;
  @ApiProperty({ enum: PermissionKey, isArray: true })
  permissions: PermissionKey[];
  @ApiProperty() member_count: number;
}

export class InvitationEntity {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty({ type: OrganizationRoleRef }) role: OrganizationRoleRef;
  @ApiProperty() expires_at: Date;
  @ApiProperty() created_at: Date;
}

export class CreatedInvitationEntity {
  @ApiProperty({ type: InvitationEntity }) invitation: InvitationEntity;
  @ApiProperty({ description: 'Plain invitation token — shown once' })
  token: string;
}

export class PermissionCatalogEntity {
  @ApiProperty({ enum: PermissionKey }) key: PermissionKey;
  @ApiProperty() group: string;
  @ApiProperty() label: string;
}
