import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { ServiceInputDto } from './service-input.dto';

export class ReplaceServicesDto {
  @ApiProperty({ type: ServiceInputDto, isArray: true })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ServiceInputDto)
  services: ServiceInputDto[];
}
