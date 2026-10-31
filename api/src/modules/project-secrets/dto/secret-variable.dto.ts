import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export const SECRET_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const SECRET_MAX_VARIABLES = 200;
export const SECRET_MAX_VALUE_LENGTH = 10_000;

export class SecretVariableDto {
  @ApiProperty({ example: 'DATABASE_URL' })
  @IsString()
  @MaxLength(200)
  @Matches(SECRET_KEY_PATTERN, {
    message: 'Variable names may only contain letters, digits and underscores',
  })
  key: string;

  @ApiProperty()
  @IsString()
  @MaxLength(SECRET_MAX_VALUE_LENGTH)
  value: string;
}
