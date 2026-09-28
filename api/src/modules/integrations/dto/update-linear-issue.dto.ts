import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const EXTERNAL_ID = /^[A-Za-z0-9-]{1,100}$/;

export class UpdateLinearIssueDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiProperty({ required: false, description: 'Markdown; empty clears it' })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  description?: string;

  @ApiProperty({ required: false, description: 'Workflow state id' })
  @IsOptional()
  @Matches(EXTERNAL_ID)
  state_id?: string;

  @ApiProperty({ required: false, nullable: true, description: 'null unassigns' })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @Matches(EXTERNAL_ID)
  assignee_id?: string | null;

  @ApiProperty({ required: false, description: '0 none, 1 urgent … 4 low' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  priority?: number;
}
