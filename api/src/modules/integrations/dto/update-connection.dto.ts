import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateConnectionDto } from './create-connection.dto';

export class UpdateConnectionDto extends PartialType(CreateConnectionDto) {
  @ApiProperty({
    required: false,
    description: 'Make this the default account for its provider',
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
