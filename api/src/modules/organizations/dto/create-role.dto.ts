import { ApiProperty } from '@nestjs/swagger';
import { PermissionKey } from 'generated/prisma';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
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

  @ApiProperty({ enum: PermissionKey, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsEnum(PermissionKey, { each: true })
  permissions: PermissionKey[];
}
