import { ApiProperty } from '@nestjs/swagger';
import { PermissionKey } from 'generated/prisma';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Contractor' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({
    required: false,
    description: 'Authority rank (1-99); defaults to just below the creator',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  rank?: number;

  @ApiProperty({ enum: PermissionKey, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsEnum(PermissionKey, { each: true })
  permissions: PermissionKey[];
}
