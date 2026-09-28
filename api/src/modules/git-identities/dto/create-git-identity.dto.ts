import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGitIdentityDto {
  @ApiProperty({ example: 'Work' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    required: false,
    description: 'Make this the default identity',
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
