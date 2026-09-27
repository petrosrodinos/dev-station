import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import {
  ActivityType,
  MemberStatus,
  Prisma,
  SystemRoleKey,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ResendMailService } from '@/integrations/notifications/resend/services/mail.service';
import { EmailConfig } from '@/shared/constants/email';
import { PermissionCatalog } from '@/shared/config/permissions';
import { ErrorCodes } from '@/shared/config/error-codes';
import { OrganizationMembership } from '@/shared/interfaces/membership.interface';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  InvitationView,
  OrganizationMemberView,
  RoleView,
} from './interfaces/organizations.interface';
import {
  createOrganizationWithOwner,
  organizationSummaryInclude,
  toOrganizationSummary,
} from './utils/organizations.utils';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const memberInclude = {
  user: {
    select: { id: true, email: true, full_name: true, avatar_url: true },
  },
  role: { select: { id: true, name: true, key: true } },
} satisfies Prisma.OrganizationMemberInclude;

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: ResendMailService,
  ) {}

  // ---- Organizations ----

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { user_id: userId, status: MemberStatus.ACTIVE },
      include: organizationSummaryInclude,
      orderBy: { joined_at: 'asc' },
    });
    return memberships.map(toOrganizationSummary);
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    const organization = await this.prisma.$transaction((tx) =>
      createOrganizationWithOwner(tx, userId, dto.name.trim()),
    );
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organization_id_user_id: {
          organization_id: organization.id,
          user_id: userId,
        },
      },
      include: organizationSummaryInclude,
    });
    return toOrganizationSummary(membership);
  }

  async findCurrent(membership: OrganizationMembership) {
    const [organization, role] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: membership.organization_id },
      }),
      this.prisma.role.findUnique({ where: { id: membership.role_id } }),
    ]);
    if (!organization) throw new NotFoundException('Organization not found');

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      created_at: organization.created_at,
      role: { id: role.id, name: role.name, key: role.key },
      permissions: membership.permissions,
    };
  }

  async update(membership: OrganizationMembership, dto: UpdateOrganizationDto) {
    await this.prisma.organization.update({
      where: { id: membership.organization_id },
      data: { name: dto.name?.trim() },
    });
    return this.findCurrent(membership);
  }

  async remove(membership: OrganizationMembership) {
    if (membership.role_key !== SystemRoleKey.OWNER) {
      throw new ForbiddenException('Only an owner can delete the organization');
    }
    await this.prisma.organization.delete({
      where: { id: membership.organization_id },
    });
    return { id: membership.organization_id };
  }

  // ---- Members ----

  async findMembers(organizationId: string): Promise<OrganizationMemberView[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { organization_id: organizationId },
      include: memberInclude,
      orderBy: { joined_at: 'asc' },
    });
    return members.map((m) => ({
      id: m.id,
      user: m.user,
      role: m.role,
      status: m.status,
      joined_at: m.joined_at,
    }));
  }

  async updateMember(
    organizationId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ): Promise<OrganizationMemberView> {
    const [member, role] = await Promise.all([
      this.prisma.organizationMember.findFirst({
        where: { id: memberId, organization_id: organizationId },
        include: { role: true },
      }),
      this.prisma.role.findFirst({
        where: { id: dto.role_id, organization_id: organizationId },
      }),
    ]);
    if (!member) throw new NotFoundException('Member not found');
    if (!role)
      throw new BadRequestException(
        'Role does not belong to this organization',
      );

    if (
      member.role.key === SystemRoleKey.OWNER &&
      role.key !== SystemRoleKey.OWNER
    ) {
      await this.assertNotLastOwner(organizationId);
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role_id: role.id },
      include: memberInclude,
    });
    return {
      id: updated.id,
      user: updated.user,
      role: updated.role,
      status: updated.status,
      joined_at: updated.joined_at,
    };
  }

  async removeMember(organizationId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organization_id: organizationId },
      include: { role: true },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role.key === SystemRoleKey.OWNER)
      await this.assertNotLastOwner(organizationId);

    await this.prisma.organizationMember.delete({ where: { id: memberId } });
    return { id: memberId };
  }

  private async assertNotLastOwner(organizationId: string) {
    const owners = await this.prisma.organizationMember.count({
      where: {
        organization_id: organizationId,
        role: { key: SystemRoleKey.OWNER },
        status: MemberStatus.ACTIVE,
      },
    });
    if (owners <= 1) {
      throw new BadRequestException({
        message: 'An organization needs at least one owner',
        code: ErrorCodes.Organizations.LAST_OWNER,
      });
    }
  }

  // ---- Invitations ----

  async findInvitations(organizationId: string): Promise<InvitationView[]> {
    const invitations = await this.prisma.organizationInvitation.findMany({
      where: {
        organization_id: organizationId,
        accepted_at: null,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      include: { role: { select: { id: true, name: true, key: true } } },
      orderBy: { created_at: 'desc' },
    });
    return invitations.map(this.toInvitationView);
  }

  async createInvitation(
    membership: OrganizationMembership,
    userId: string,
    dto: CreateInvitationDto,
  ) {
    const email = dto.email.toLowerCase().trim();
    const [role, existingMember, organization] = await Promise.all([
      this.prisma.role.findFirst({
        where: { id: dto.role_id, organization_id: membership.organization_id },
      }),
      this.prisma.organizationMember.findFirst({
        where: { organization_id: membership.organization_id, user: { email } },
      }),
      this.prisma.organization.findUnique({
        where: { id: membership.organization_id },
      }),
    ]);
    if (!role)
      throw new BadRequestException(
        'Role does not belong to this organization',
      );
    if (existingMember)
      throw new ConflictException('This user is already a member');
    if (
      role.key === SystemRoleKey.OWNER &&
      membership.role_key !== SystemRoleKey.OWNER
    ) {
      throw new ForbiddenException('Only owners can invite other owners');
    }

    const token = randomBytes(24).toString('hex');
    const invitation = await this.prisma.$transaction(async (tx) => {
      await tx.organizationInvitation.updateMany({
        where: {
          organization_id: membership.organization_id,
          email,
          accepted_at: null,
          revoked_at: null,
        },
        data: { revoked_at: new Date() },
      });
      return tx.organizationInvitation.create({
        data: {
          organization_id: membership.organization_id,
          email,
          role_id: role.id,
          token_hash: this.hashToken(token),
          invited_by: userId,
          expires_at: new Date(Date.now() + INVITATION_TTL_MS),
        },
        include: { role: { select: { id: true, name: true, key: true } } },
      });
    });

    setImmediate(async () => {
      try {
        await this.mailService.sendEmail({
          to: email,
          from: EmailConfig.email_addresses.alert,
          subject: `You're invited to ${organization.name} on Dev Station`,
          html: `<p>You have been invited to join <strong>${organization.name}</strong> on Dev Station as ${role.name}.</p><p>Open Dev Station, go to Organization → Join organization and paste this invitation code:</p><pre>${token}</pre><p>The code expires in 7 days.</p>`,
        });
      } catch (error) {
        this.logger.warn(`Invitation email not sent: ${error?.message}`);
      }
    });

    return { invitation: this.toInvitationView(invitation), token };
  }

  async revokeInvitation(organizationId: string, invitationId: string) {
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: { id: invitationId, organization_id: organizationId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    await this.prisma.organizationInvitation.update({
      where: { id: invitationId },
      data: { revoked_at: new Date() },
    });
    return { id: invitationId };
  }

  async acceptInvitation(userId: string, token: string) {
    const [invitation, user] = await Promise.all([
      this.prisma.organizationInvitation.findUnique({
        where: { token_hash: this.hashToken(token) },
      }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (
      !invitation ||
      invitation.accepted_at ||
      invitation.revoked_at ||
      invitation.expires_at < new Date()
    ) {
      throw new BadRequestException({
        message: 'Invalid or expired invitation',
        code: ErrorCodes.Organizations.INVALID_INVITATION,
      });
    }
    if (invitation.email !== user.email.toLowerCase()) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.upsert({
        where: {
          organization_id_user_id: {
            organization_id: invitation.organization_id,
            user_id: userId,
          },
        },
        update: { role_id: invitation.role_id, status: MemberStatus.ACTIVE },
        create: {
          organization_id: invitation.organization_id,
          user_id: userId,
          role_id: invitation.role_id,
        },
        include: organizationSummaryInclude,
      });
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { accepted_at: new Date() },
      });
      await tx.activity.create({
        data: {
          organization_id: invitation.organization_id,
          user_id: userId,
          type: ActivityType.MEMBER_JOINED,
          message: `${user.full_name || user.email} joined the organization`,
        },
      });
      return member;
    });

    return toOrganizationSummary(membership);
  }

  // ---- Roles ----

  async findRoles(organizationId: string): Promise<RoleView[]> {
    const roles = await this.prisma.role.findMany({
      where: { organization_id: organizationId },
      include: { permissions: true, _count: { select: { members: true } } },
      orderBy: [{ is_system: 'desc' }, { created_at: 'asc' }],
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      key: role.key,
      description: role.description,
      is_system: role.is_system,
      permissions: role.permissions.map((p) => p.permission),
      member_count: role._count.members,
    }));
  }

  async createRole(
    organizationId: string,
    dto: CreateRoleDto,
  ): Promise<RoleView> {
    const existing = await this.prisma.role.findFirst({
      where: { organization_id: organizationId, name: dto.name.trim() },
    });
    if (existing)
      throw new ConflictException('A role with this name already exists');

    const role = await this.prisma.role.create({
      data: {
        organization_id: organizationId,
        name: dto.name.trim(),
        description: dto.description,
        key: SystemRoleKey.CUSTOM,
        permissions: {
          create: dto.permissions.map((permission) => ({ permission })),
        },
      },
    });
    return this.findRole(organizationId, role.id);
  }

  async updateRole(
    organizationId: string,
    roleId: string,
    dto: UpdateRoleDto,
  ): Promise<RoleView> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organization_id: organizationId },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.key === SystemRoleKey.OWNER)
      throw new ForbiddenException('The Owner role cannot be modified');

    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id: roleId },
        data: {
          name: role.is_system ? undefined : dto.name?.trim(),
          description: dto.description,
        },
      });
      if (dto.permissions) {
        await tx.rolePermission.deleteMany({ where: { role_id: roleId } });
        await tx.rolePermission.createMany({
          data: dto.permissions.map((permission) => ({
            role_id: roleId,
            permission,
          })),
        });
      }
    });
    return this.findRole(organizationId, roleId);
  }

  async removeRole(organizationId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organization_id: organizationId },
      include: { _count: { select: { members: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.is_system)
      throw new BadRequestException('System roles cannot be deleted');
    if (role._count.members > 0)
      throw new BadRequestException(
        'Reassign members before deleting this role',
      );

    await this.prisma.role.delete({ where: { id: roleId } });
    return { id: roleId };
  }

  getPermissionCatalog() {
    return PermissionCatalog;
  }

  private async findRole(
    organizationId: string,
    roleId: string,
  ): Promise<RoleView> {
    const roles = await this.findRoles(organizationId);
    return roles.find((r) => r.id === roleId);
  }

  private toInvitationView(invitation: {
    id: string;
    email: string;
    expires_at: Date;
    created_at: Date;
    role: { id: string; name: string; key: SystemRoleKey };
  }): InvitationView {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at,
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
