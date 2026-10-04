import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiProperty({
    required: false,
    description: 'true archives the project, false restores it',
  })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
