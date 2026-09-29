import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { paginate } from '@/shared/utils/pagination/pagination.utils';
import { AdminUsersQueryType } from './dto/admin-users-query.schema';
import { UpdateReleaseLimitsDto } from './dto/update-release-limits.dto';

const adminUserSelect = {
  id: true,
  email: true,
  full_name: true,
  avatar_url: true,
  role: true,
  created_at: true,
} satisfies Prisma.UserSelect;

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const startOfWeek = new Date(now.getTime() - 7 * DAY_MS);
    const startOfMonth = new Date(now.getTime() - 30 * DAY_MS);

    const [
      total_users,
      new_users_this_week,
      new_users_this_month,
      active_agent_sessions,
      recentSignups,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { created_at: { gte: startOfWeek } } }),
      this.prisma.user.count({ where: { created_at: { gte: startOfMonth } } }),
      this.prisma.agentSession.count({ where: { status: 'RUNNING' } }),
      this.prisma.user.findMany({
        where: { created_at: { gte: startOfMonth } },
        select: { created_at: true },
      }),
    ]);

    return {
      total_users,
      new_users_this_week,
      new_users_this_month,
      active_agent_sessions,
      signups_last_30_days: this.bucketByDay(
        recentSignups.map((u) => u.created_at),
        startOfMonth,
        now,
      ),
    };
  }

  async getUsers(query: AdminUsersQueryType) {
    const where: Prisma.UserWhereInput = {
      ...(query.role && { role: query.role }),
      ...(query.search && {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { full_name: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: { created_at: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  /** Every platform's published release — desktop distribution/version tracking (docs/electron-distribution-and-updates.md). */
  getReleases() {
    return this.prisma.appRelease.findMany({ orderBy: { platform: 'asc' } });
  }

  /** Hand-set `min_version`/`release_notes` for a platform's release without re-publishing it (CI owns version/download_url). */
  async updateReleaseLimits(platform: string, dto: UpdateReleaseLimitsDto) {
    const existing = await this.prisma.appRelease.findUnique({
      where: { platform },
    });
    if (!existing)
      throw new NotFoundException('No release published for this platform yet');

    return this.prisma.appRelease.update({
      where: { platform },
      data: {
        ...(dto.min_version !== undefined && {
          min_version: dto.min_version || null,
        }),
        ...(dto.release_notes !== undefined && {
          release_notes: dto.release_notes,
        }),
      },
    });
  }

  /** Device adoption by platform + version, plus recent-activity counts. */
  async getInstallAdoption() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [total_devices, active_last_7_days, active_last_30_days, grouped] =
      await Promise.all([
        this.prisma.appInstall.count(),
        this.prisma.appInstall.count({
          where: { last_seen_at: { gte: sevenDaysAgo } },
        }),
        this.prisma.appInstall.count({
          where: { last_seen_at: { gte: thirtyDaysAgo } },
        }),
        this.prisma.appInstall.groupBy({
          by: ['platform', 'app_version'],
          _count: { _all: true },
        }),
      ]);

    const by_version = grouped
      .map((g) => ({
        platform: g.platform,
        app_version: g.app_version,
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total_devices,
      active_last_7_days,
      active_last_30_days,
      by_version,
    };
  }

  /** Buckets a list of dates into day-granularity counts covering [from, to]. */
  private bucketByDay(dates: Date[], from: Date, to: Date) {
    const counts = new Map<string, number>();
    for (const date of dates) {
      const key = date.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const days: { date: string; count: number }[] = [];
    const cursor = new Date(from);
    cursor.setUTCHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setUTCHours(0, 0, 0, 0);

    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      days.push({ date: key, count: counts.get(key) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days;
  }
}
