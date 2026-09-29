import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReleaseLimitsDto {
  @ApiProperty({
    required: false,
    description:
      'Installs below this version are hard-blocked in-app. Empty string clears enforcement.',
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
