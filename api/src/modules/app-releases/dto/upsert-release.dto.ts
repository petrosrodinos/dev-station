import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpsertReleaseDto {
  @ApiProperty({ example: '1.4.0' })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  version: string;

  @ApiProperty({
    example:
      'https://github.com/petrosrodinos/dev-station/releases/download/v1.4.0/Dev-Station-Setup-1.4.0.exe',
  })
  @IsUrl()
  download_url: string;

  @ApiProperty({
    required: false,
    description:
      'Installs below this version are hard-blocked in-app. Leave unset for no enforcement.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  min_version?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  release_notes?: string;
}
