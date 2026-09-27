import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from 'generated/prisma';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  type: ActivityType;

  @ApiProperty({ example: 'Push completed' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  agent_session_id?: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
