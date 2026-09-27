import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReorderProjectsDto {
  @ApiProperty({
    type: String,
    isArray: true,
    description: 'Project ids in the desired order',
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  ids: string[];
}
