import { ApiProperty } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MAX_LAYOUT_NAME_LENGTH } from '../constants/workspace-layouts.constants';

export class CreateLayoutDto {
  @ApiProperty({ example: 'Development' })
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_LAYOUT_NAME_LENGTH)
  name: string;

  @ApiProperty({ description: 'Opaque DockviewApi.toJSON() tree' })
  @IsObject()
  layout: Record<string, unknown>;

  @ApiProperty({
    required: false,
    description: 'Floating (real OS window) panel bounds',
    type: [Object],
  })
  @IsOptional()
  floating?: unknown[];
}
