import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AgentType } from 'generated/prisma';

export class CreateAgentCommandDto {
  @ApiProperty({ example: 'YOLO' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiProperty({ enum: AgentType })
  @IsEnum(AgentType)
  agent_type: AgentType;

  @ApiProperty({ example: 'claude --dangerously-skip-permissions' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  command: string;

  @ApiProperty({
    required: false,
    description: 'Make this the default command for its agent type',
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
