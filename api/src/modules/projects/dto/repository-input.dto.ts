import { ApiProperty } from '@nestjs/swagger';
import { RepositoryProvider } from 'generated/prisma';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RepositoryInputDto {
  @ApiProperty({ example: 'https://github.com/company/project.git' })
  @IsString()
  @MinLength(4)
  @MaxLength(500)
  clone_url: string;

  @ApiProperty({ enum: RepositoryProvider, required: false })
  @IsOptional()
  @IsEnum(RepositoryProvider)
  provider?: RepositoryProvider;

  @ApiProperty({ required: false, example: 'company/project' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  full_name?: string;

  @ApiProperty({ required: false, example: 'main' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  default_branch?: string;

  @ApiProperty({
    required: false,
    description: 'Provider id of the repository',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  external_id?: string;

  @ApiProperty({
    required: false,
    description: 'Integration connection used to access the repository',
  })
  @IsOptional()
  @IsUUID()
  connection_id?: string;
}
