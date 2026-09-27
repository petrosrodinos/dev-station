import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false, example: 'Ada Lovelace' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  full_name?: string;

  @ApiProperty({ required: false, example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsUrl()
  avatar_url?: string;
}
