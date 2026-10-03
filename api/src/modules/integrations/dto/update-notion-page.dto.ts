import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateNotionPageDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  title?: string;

  @ApiProperty({
    required: false,
    description: 'Notion-flavored markdown; replaces the whole page body',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200000)
  markdown?: string;
}
