import { ApiProperty } from '@nestjs/swagger';
import { AuthRole } from 'generated/prisma';

export class AdminUserEntity {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty({ nullable: true }) full_name: string | null;
  @ApiProperty({ nullable: true }) avatar_url: string | null;
  @ApiProperty({ enum: AuthRole }) role: AuthRole;
  @ApiProperty() created_at: Date;
}
