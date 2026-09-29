import { ApiProperty } from '@nestjs/swagger';
import { SkillFavoriteKind, SkillKind, SkillProvider } from 'generated/prisma';

export class SkillEntity {
  @ApiProperty() id: string;
  @ApiProperty() organization_id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() body: string;
  @ApiProperty({ enum: SkillProvider }) provider: SkillProvider;
  @ApiProperty({ enum: SkillKind }) kind: SkillKind;
  @ApiProperty() is_public: boolean;
  @ApiProperty() created_by: string;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}

export class SkillFavoriteEntity {
  @ApiProperty() id: string;
  @ApiProperty() user_id: string;
  @ApiProperty() organization_id: string;
  @ApiProperty({ enum: SkillFavoriteKind }) target_kind: SkillFavoriteKind;
  @ApiProperty() ref_id: string;
  @ApiProperty() created_at: Date;
}
