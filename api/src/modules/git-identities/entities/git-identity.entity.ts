import { ApiProperty } from '@nestjs/swagger';

export class GitIdentityEntity {
  @ApiProperty() id: string;
  @ApiProperty() label: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty() is_default: boolean;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}
