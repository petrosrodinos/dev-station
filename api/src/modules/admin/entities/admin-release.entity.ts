import { ApiProperty } from '@nestjs/swagger';

export class AdminReleaseEntity {
  @ApiProperty() platform: string;
  @ApiProperty() version: string;
  @ApiProperty() download_url: string;
  @ApiProperty({ nullable: true, type: String }) min_version: string | null;
  @ApiProperty({ nullable: true, type: String }) release_notes: string | null;
  @ApiProperty() download_count: number;
  @ApiProperty() published_at: Date;
  @ApiProperty() updated_at: Date;
}

export class InstallsByVersionEntity {
  @ApiProperty() platform: string;
  @ApiProperty() app_version: string;
  @ApiProperty() count: number;
}

export class AdminInstallAdoptionEntity {
  @ApiProperty() total_devices: number;
  @ApiProperty() active_last_7_days: number;
  @ApiProperty() active_last_30_days: number;
  @ApiProperty({ type: InstallsByVersionEntity, isArray: true })
  by_version: InstallsByVersionEntity[];
}
