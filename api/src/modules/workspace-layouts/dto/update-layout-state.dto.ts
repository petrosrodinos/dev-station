import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateLayoutStateDto {
  @ApiProperty({
    required: false,
    description: 'Preset to make active workspace-wide',
  })
  @IsOptional()
  @IsUUID()
  active_preset_id?: string;

  @ApiProperty({
    required: false,
    description:
      'Project whose remembered preset is being set (paired with preset_id)',
  })
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiProperty({
    required: false,
    description: 'Preset to remember for `project_id`',
  })
  @IsOptional()
  @IsUUID()
  preset_id?: string;
}
