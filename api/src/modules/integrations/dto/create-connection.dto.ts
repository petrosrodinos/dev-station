import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateConnectionDto {
  @ApiProperty({ required: false, example: 'Company GitHub' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label?: string;
}
