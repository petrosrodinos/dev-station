import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'LogiqDev' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;
}
