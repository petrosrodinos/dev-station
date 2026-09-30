import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { PingInstallDto } from './dto/ping-install.dto';
import { UpsertReleaseDto } from './dto/upsert-release.dto';
import { LatestReleaseInfo } from './interfaces/app-releases.interface';

@Injectable()
export class AppReleasesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Upserts the calling device's install record — no user/org, a device may ping pre-login. */
  ping(dto: PingInstallDto) {
    return this.prisma.appInstall.upsert({
      where: { device_id: dto.device_id },
      create: {
        device_id: dto.device_id,
        platform: dto.platform,
        arch: dto.arch,
        app_version: dto.app_version,
      },
      update: {
        platform: dto.platform,
        arch: dto.arch,
        app_version: dto.app_version,
      },
      select: { device_id: true },
    });
  }

  async getLatest(platform: string): Promise<LatestReleaseInfo> {
    const release = await this.prisma.appRelease.findUnique({
      where: { platform },
    });
    if (!release) throw new NotFoundException('No release published yet');
    return {
      version: release.version,
      download_url: release.download_url,
      min_version: release.min_version,
      release_notes: release.release_notes,
    };
  }

  /** Every platform's current release — public, used by the landing site's downloads page. */
  getAll() {
    return this.prisma.appRelease.findMany({
      orderBy: { platform: 'asc' },
      select: {
        platform: true,
        version: true,
        download_url: true,
        min_version: true,
        release_notes: true,
        published_at: true,
      },
    });
  }

  /** Returns the download URL and bumps the counter — used by the public download redirect. */
  async recordDownload(platform: string): Promise<string> {
    const existing = await this.prisma.appRelease.findUnique({
      where: { platform },
      select: { download_url: true },
    });
    if (!existing) throw new NotFoundException('No release published yet');

    const release = await this.prisma.appRelease.update({
      where: { platform },
      data: { download_count: { increment: 1 } },
      select: { download_url: true },
    });
    return release.download_url;
  }

  upsertRelease(platform: string, dto: UpsertReleaseDto) {
    return this.prisma.appRelease.upsert({
      where: { platform },
      create: { platform, ...dto },
      update: { ...dto },
    });
  }
}
