import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const EXTERNAL_ID = /^[A-Za-z0-9-]{1,100}$/;

export class CreateNotionPageDto {
  @ApiProperty({ description: 'Parent page id' })
  @Matches(EXTERNAL_ID)
  parent_id: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  title: string;

  @ApiProperty({ required: false, description: 'Notion-flavored markdown' })
  @IsOptional()
  @IsString()
  @MaxLength(200000)
  markdown?: string;
}
