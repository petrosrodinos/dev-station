import { ApiProperty } from '@nestjs/swagger';
import { AgentType } from 'generated/prisma';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePreferencesDto {
  @ApiProperty({
    required: false,
    description: 'Organization selected in the app',
  })
  @IsOptional()
  @IsUUID()
  active_organization_id?: string;

  @ApiProperty({ required: false, example: 'Ada Lovelace' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  git_name?: string;

  @ApiProperty({ required: false, example: 'ada@example.com' })
  @IsOptional()
  @IsEmail()
  git_email?: string;

  @ApiProperty({ required: false, enum: AgentType })
  @IsOptional()
  @IsEnum(AgentType)
  preferred_agent?: AgentType;

  @ApiProperty({ required: false, example: 'main' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  default_branch?: string;

  @ApiProperty({
    required: false,
    example: 45,
    description: 'Seconds without output before a session is "awaiting input"',
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(600)
  idle_threshold_seconds?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  confirm_destructive?: boolean;

  @ApiProperty({ required: false, enum: ['dark', 'light', 'system'] })
  @IsOptional()
  @IsIn(['dark', 'light', 'system'])
  theme?: string;
}
