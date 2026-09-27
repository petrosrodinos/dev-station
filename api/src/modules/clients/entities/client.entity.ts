import { ApiProperty } from '@nestjs/swagger';

export class ClientEntity {
  @ApiProperty() id: string;
  @ApiProperty() organization_id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) color: string | null;
  @ApiProperty() sort_order: number;
  @ApiProperty() project_count: number;
  @ApiProperty() created_at: Date;
}
