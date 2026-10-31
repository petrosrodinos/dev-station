import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
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

  @ApiProperty({ type: SecretVariableDto, isArray: true })
  @IsArray()
  @ArrayMaxSize(SECRET_MAX_VARIABLES)
  @ValidateNested({ each: true })
  @Type(() => SecretVariableDto)
  variables: SecretVariableDto[];
}
