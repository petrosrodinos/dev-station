import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SECRET_MAX_VARIABLES, SecretVariableDto } from './secret-variable.dto';

export class CreateSecretSetDto {
  @ApiProperty({ example: 'api .env' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({
    required: false,
    example: 'apps/api/.env',
    description: 'Project-relative env file this set mirrors. Empty clears it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  // Relative, forward-slash paths only: no absolute paths and no ".." segments.
  @Matches(/^(?!\/)(?![A-Za-z]:)(?!(.*\/)?\.\.(\/|$))[^\\\u0000]*$/, {
    message: 'source_path must be a relative path inside the project',
  })
  source_path?: string;

  @ApiProperty({ type: SecretVariableDto, isArray: true })
  @IsArray()
  @ArrayMaxSize(SECRET_MAX_VARIABLES)
  @ValidateNested({ each: true })
  @Type(() => SecretVariableDto)
  variables: SecretVariableDto[];
}
