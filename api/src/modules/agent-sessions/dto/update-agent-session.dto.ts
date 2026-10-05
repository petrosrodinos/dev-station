import { ApiProperty } from '@nestjs/swagger';
import { AgentSessionStatus } from 'generated/prisma';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateAgentSessionDto {
  @ApiProperty({ required: false, enum: AgentSessionStatus })
  @IsOptional()
  @IsEnum(AgentSessionStatus)
  status?: AgentSessionStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  files_changed?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  additions?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  deletions?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^[0-9a-f]{7,40}$/i)
  commit_sha?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  exit_code?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  ended_at?: string;

  @ApiProperty({
    required: false,
    description:
      'Record the status change without an activity entry (sessions nobody worked in)',
  })
  @IsOptional()
  @IsBoolean()
  silent?: boolean;
}
