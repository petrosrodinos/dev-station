import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberStatus } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import {
  organizationSummaryInclude,
  toOrganizationSummary,
} from '@/modules/organizations/utils/organizations.utils';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { Me } from './interfaces/users.interface';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<Me> {
    const [user, memberships] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.organizationMember.findMany({
        where: { user_id: userId, status: MemberStatus.ACTIVE },
        include: organizationSummaryInclude,
        orderBy: { joined_at: 'asc' },
      }),
    ]);

    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role,
      organizations: memberships.map(toOrganizationSummary),
    };
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<Me> {
    await this.prisma.user.update({ where: { id: userId }, data: dto });
    return this.getMe(userId);
  }

  getPreferences(userId: string) {
    return this.prisma.userPreference.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId },
    });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    if (dto.active_organization_id) {
      const member = await this.prisma.organizationMember.findUnique({
        where: {
          organization_id_user_id: {
            organization_id: dto.active_organization_id,
            user_id: userId,
          },
        },
      });
      if (!member)
        throw new ForbiddenException(
          'You are not a member of this organization',
        );
    }

    return this.prisma.userPreference.upsert({
      where: { user_id: userId },
      update: dto,
      create: { user_id: userId, ...dto },
    });
  }
}
