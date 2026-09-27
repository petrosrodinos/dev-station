import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionKey } from 'generated/prisma';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrganizationGuard } from '@/shared/guards/organization.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { CurrentMembership } from '@/shared/decorators/current-membership.decorator';
import { RequirePermissions } from '@/shared/decorators/require-permissions.decorator';
import { ORGANIZATION_HEADER } from '@/shared/constants/headers';
import { OrganizationMembership } from '@/shared/interfaces/membership.interface';
import { OrganizationSummaryEntity } from '@/modules/users/entities/users.entity';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  CreatedInvitationEntity,
  InvitationEntity,
  OrganizationMemberEntity,
  PermissionCatalogEntity,
  RoleEntity,
} from './entities/organization.entity';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Organizations the current user belongs to' })
  @ApiResponse({ status: 200, type: OrganizationSummaryEntity, isArray: true })
  findAll(@CurrentUser('id') userId: string) {
    return this.organizationsService.findAllForUser(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an organization (caller becomes owner)' })
  @ApiResponse({ status: 201, type: OrganizationSummaryEntity })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(userId, dto);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Permission catalog' })
  @ApiResponse({ status: 200, type: PermissionCatalogEntity, isArray: true })
  getPermissionCatalog() {
    return this.organizationsService.getPermissionCatalog();
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept an invitation token and join the organization',
  })
  @ApiResponse({ status: 200, type: OrganizationSummaryEntity })
  acceptInvitation(
    @CurrentUser('id') userId: string,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.organizationsService.acceptInvitation(userId, dto.token);
  }
}

@ApiTags('Organizations')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('organizations/current')
@UseGuards(JwtGuard, OrganizationGuard)
export class CurrentOrganizationController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Current organization with caller role and permissions',
  })
  findCurrent(@CurrentMembership() membership: OrganizationMembership) {
    return this.organizationsService.findCurrent(membership);
  }

  @Patch()
  @RequirePermissions(PermissionKey.ORG_MANAGE_SETTINGS)
  @ApiOperation({ summary: 'Update organization settings' })
  update(
    @CurrentMembership() membership: OrganizationMembership,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(membership, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete the organization (owners only)' })
  remove(@CurrentMembership() membership: OrganizationMembership) {
    return this.organizationsService.remove(membership);
  }

  @Get('members')
  @ApiOperation({ summary: 'List members' })
  @ApiResponse({ status: 200, type: OrganizationMemberEntity, isArray: true })
  findMembers(@CurrentMembership('organization_id') organizationId: string) {
    return this.organizationsService.findMembers(organizationId);
  }

  @Patch('members/:memberId')
  @RequirePermissions(PermissionKey.ORG_MANAGE_MEMBERS)
  @ApiOperation({ summary: "Change a member's role" })
  @ApiResponse({ status: 200, type: OrganizationMemberEntity })
  updateMember(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.organizationsService.updateMember(
      organizationId,
      memberId,
      dto,
    );
  }

  @Delete('members/:memberId')
  @RequirePermissions(PermissionKey.ORG_MANAGE_MEMBERS)
  @ApiOperation({ summary: 'Remove a member' })
  removeMember(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.organizationsService.removeMember(organizationId, memberId);
  }

  @Get('invitations')
  @RequirePermissions(PermissionKey.ORG_MANAGE_MEMBERS)
  @ApiOperation({ summary: 'Pending invitations' })
  @ApiResponse({ status: 200, type: InvitationEntity, isArray: true })
  findInvitations(
    @CurrentMembership('organization_id') organizationId: string,
  ) {
    return this.organizationsService.findInvitations(organizationId);
  }

  @Post('invitations')
  @RequirePermissions(PermissionKey.ORG_MANAGE_MEMBERS)
  @ApiOperation({ summary: 'Invite a member by email' })
  @ApiResponse({ status: 201, type: CreatedInvitationEntity })
  createInvitation(
    @CurrentMembership() membership: OrganizationMembership,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.organizationsService.createInvitation(membership, userId, dto);
  }

  @Delete('invitations/:id')
  @RequirePermissions(PermissionKey.ORG_MANAGE_MEMBERS)
  @ApiOperation({ summary: 'Revoke an invitation' })
  revokeInvitation(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.organizationsService.revokeInvitation(organizationId, id);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Roles with permissions' })
  @ApiResponse({ status: 200, type: RoleEntity, isArray: true })
  findRoles(@CurrentMembership('organization_id') organizationId: string) {
    return this.organizationsService.findRoles(organizationId);
  }

  @Post('roles')
  @RequirePermissions(PermissionKey.ORG_MANAGE_ROLES)
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiResponse({ status: 201, type: RoleEntity })
  createRole(
    @CurrentMembership('organization_id') organizationId: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.organizationsService.createRole(organizationId, dto);
  }

  @Patch('roles/:id')
  @RequirePermissions(PermissionKey.ORG_MANAGE_ROLES)
  @ApiOperation({ summary: 'Update a role and its permissions' })
  @ApiResponse({ status: 200, type: RoleEntity })
  updateRole(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.organizationsService.updateRole(organizationId, id, dto);
  }

  @Delete('roles/:id')
  @RequirePermissions(PermissionKey.ORG_MANAGE_ROLES)
  @ApiOperation({ summary: 'Delete a custom role' })
  removeRole(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.organizationsService.removeRole(organizationId, id);
  }
}
