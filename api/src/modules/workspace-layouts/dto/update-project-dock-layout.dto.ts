import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class UpdateProjectDockLayoutDto {
  @ApiProperty({ description: 'Project whose dock arrangement this is' })
  @IsString()
  project_id: string;

  @ApiProperty({
    description: "Opaque DockviewApi.toJSON() tree for that project's tab dock",
    type: Object,
  })
  @IsObject()
  layout: Record<string, unknown>;
}
