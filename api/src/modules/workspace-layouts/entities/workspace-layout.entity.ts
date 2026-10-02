import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceLayoutPresetEntity {
  @ApiProperty() id: string;
  @ApiProperty() user_id: string;
  @ApiProperty() name: string;
  @ApiProperty() is_default: boolean;
  @ApiProperty() layout_version: number;
  @ApiProperty() layout: Record<string, unknown>;
  @ApiProperty({ type: [Object] }) floating: unknown[];
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}

export class WorkspaceLayoutStateEntity {
  @ApiProperty() id: string;
  @ApiProperty() user_id: string;
  @ApiProperty({ nullable: true }) active_preset_id: string | null;
  @ApiProperty({ type: Object, description: 'Record<projectId, presetId>' })
  preset_by_project: Record<string, string>;
  @ApiProperty({
    type: Object,
    description: 'Record<projectId, SerializedDockview>',
  })
  project_dock_layout: Record<string, Record<string, unknown>>;
  @ApiProperty() updated_at: Date;
}
