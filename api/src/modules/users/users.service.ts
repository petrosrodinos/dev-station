import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberStatus, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import {
  organizationSummaryInclude,
  toOrganizationSummary,
} from '@/modules/organizations/utils/organizations.utils';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { Me } from './interfaces/users.interface';
import { NOTIFICATION_EVENT_TYPES } from './constants/notification-settings.constants';
import {
  assertValidNotificationSettingsPatch,
  resolveNotificationSettings,
} from './utils/notification-settings.utils';

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

  async getPreferences(userId: string) {
    const preferences = await this.prisma.userPreference.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId },
    });
    return withResolvedNotifications(preferences);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const { notification_settings: notificationPatch, ...rest } = dto;
    const data: Prisma.UserPreferenceUncheckedUpdateInput = { ...rest };

    if (notificationPatch !== undefined) {
      assertValidNotificationSettingsPatch(notificationPatch);
      const current = await this.prisma.userPreference.findUnique({
        where: { user_id: userId },
        select: { notification_settings: true },
      });
      const stored = resolveNotificationSettings(
        current?.notification_settings,
      );
      const merged = resolveNotificationSettings({
        enabled: notificationPatch.enabled ?? stored.enabled,
        events: Object.fromEntries(
          NOTIFICATION_EVENT_TYPES.map((type) => [
            type,
            { ...stored.events[type], ...notificationPatch.events?.[type] },
          ]),
        ),
      });
      data.notification_settings = merged as unknown as Prisma.InputJsonValue;
    }

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

    const preferences = await this.prisma.userPreference.upsert({
      where: { user_id: userId },
      update: data,
      create: {
        user_id: userId,
        ...(data as Prisma.UserPreferenceUncheckedCreateInput),
      },
    });
    return withResolvedNotifications(preferences);
  }
}

function withResolvedNotifications<
  T extends { notification_settings: unknown },
>(preferences: T) {
  return {
    ...preferences,
    notification_settings: resolveNotificationSettings(
      preferences.notification_settings,
    ),
  };
}
