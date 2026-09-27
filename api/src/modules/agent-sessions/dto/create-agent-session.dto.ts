import { ApiProperty } from '@nestjs/swagger';
import { AgentType, IntegrationProvider } from 'generated/prisma';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAgentSessionDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty({ enum: AgentType })
  @IsEnum(AgentType)
  agent_type: AgentType;

  @ApiProperty({ example: 'Fix authentication bug' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  initial_prompt?: string;

  @ApiProperty({
    required: false,
    description: 'Device that runs the CLI process',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  device_id?: string;

  @ApiProperty({ required: false, enum: IntegrationProvider })
  @IsOptional()
  @IsEnum(IntegrationProvider)
  issue_provider?: IntegrationProvider;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  issue_external_id?: string;

  @ApiProperty({ required: false, example: 'LIN-234' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  issue_key?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  issue_title?: string;
}
