import { ApiProperty } from '@nestjs/swagger';

export class AppReleaseEntity {
  @ApiProperty() platform: string;
  @ApiProperty() version: string;
  @ApiProperty() download_url: string;
  @ApiProperty({ nullable: true, type: String }) min_version: string | null;
  @ApiProperty({ nullable: true, type: String }) release_notes: string | null;
  @ApiProperty() published_at: Date;
}
