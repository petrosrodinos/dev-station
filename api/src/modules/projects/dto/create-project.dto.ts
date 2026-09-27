import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AgentType } from 'generated/prisma';
import {
  IsArray,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RepositoryInputDto } from './repository-input.dto';
import { ServiceInputDto } from './service-input.dto';

export class CreateProjectDto {
  @ApiProperty({ example: 'Client Platform' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @ApiProperty({
    required: false,
    description:
      'Creates (or reuses) a client by name when client_id is not given',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  client_name?: string;

  @ApiProperty({ required: false, example: '#8b7cf6' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    required: false,
    example: 'apps/frontend',
    description: 'Sub-directory inside a monorepo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(/^(?!.*\.\.)(?![\\/])[^\0]*$/, {
    message: 'sub_path must be a relative path inside the repository',
  })
  sub_path?: string;

  @ApiProperty({ required: false, type: RepositoryInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RepositoryInputDto)
  repository?: RepositoryInputDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  github_connection_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  linear_connection_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  linear_team_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  linear_project_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  notion_connection_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  notion_root_page_id?: string;

  @ApiProperty({ required: false, enum: AgentType })
  @IsOptional()
  @IsEnum(AgentType)
  preferred_agent?: AgentType;

  @ApiProperty({ required: false, type: ServiceInputDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceInputDto)
  services?: ServiceInputDto[];
}
