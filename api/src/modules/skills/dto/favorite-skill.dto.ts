import { ApiProperty } from '@nestjs/swagger';
import { SkillFavoriteKind } from 'generated/prisma';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class FavoriteSkillDto {
  @ApiProperty({ enum: SkillFavoriteKind })
  @IsEnum(SkillFavoriteKind)
  target_kind: SkillFavoriteKind;

  @ApiProperty({
    description:
      'The custom Skill id (target_kind CUSTOM) or the system-scanned skill’s stable scan id (target_kind SYSTEM)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  ref_id: string;
}
