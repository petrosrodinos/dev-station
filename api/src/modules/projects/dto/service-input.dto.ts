import { ApiProperty } from '@nestjs/swagger';
import { ServiceKind } from 'generated/prisma';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ServiceInputDto {
  @ApiProperty({ example: 'Frontend' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @ApiProperty({ enum: ServiceKind, required: false })
  @IsOptional()
  @IsEnum(ServiceKind)
  kind?: ServiceKind;

  @ApiProperty({
    required: false,
    example: 'apps/frontend',
    description: 'Working directory relative to the project root',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(/^(?!.*\.\.)(?![\\/])[^\0]*$/, {
    message: 'cwd must be a relative path inside the project',
  })
  cwd?: string;

  @ApiProperty({ required: false, example: 'pnpm' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  package_manager?: string;

  @ApiProperty({
    required: false,
    example: 'dev',
    description: 'package.json script name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  script?: string;

  @ApiProperty({
    required: false,
    example: 'docker compose up db',
    description: 'Custom command when not a package script',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  command?: string;

  @ApiProperty({ required: false, example: 5173 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiProperty({ required: false, example: 'http://localhost:5173' })
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  url?: string;

  @ApiProperty({
    required: false,
    type: Object,
    description: 'Non-secret environment overrides',
  })
  @IsOptional()
  @IsObject()
  env?: Record<string, string>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  auto_detected?: boolean;
}
