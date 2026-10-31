import { ApiProperty } from '@nestjs/swagger';

export class SecretVariableEntity {
  @ApiProperty() key: string;
  @ApiProperty() value: string;
}

export class SecretSetUpdaterEntity {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty({ nullable: true }) full_name: string | null;
}

export class SecretSetSummaryEntity {
  @ApiProperty() id: string;
  @ApiProperty() project_id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() variable_count: number;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
  @ApiProperty({ nullable: true, type: SecretSetUpdaterEntity })
  updated_by: SecretSetUpdaterEntity | null;
}

export class SecretSetEntity extends SecretSetSummaryEntity {
  @ApiProperty({ type: SecretVariableEntity, isArray: true })
  variables: SecretVariableEntity[];
}
