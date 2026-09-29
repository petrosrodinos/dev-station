import { ApiProperty } from '@nestjs/swagger';
import { SkillKind, SkillProvider } from 'generated/prisma';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Matches the terminal-paste cap used when sending a skill into an agent session. */
export const SKILL_BODY_MAX_LENGTH = 90_000;

export class CreateSkillDto {
  @ApiProperty({ example: 'Conventional commits' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'Write commit messages as `type(scope): summary`...' })
  @IsString()
  @MinLength(1)
  @MaxLength(SKILL_BODY_MAX_LENGTH)
  body: string;

  @ApiProperty({ enum: SkillProvider, default: SkillProvider.GENERIC })
  @IsEnum(SkillProvider)
  provider: SkillProvider;

  @ApiProperty({ enum: SkillKind, default: SkillKind.SKILL })
  @IsEnum(SkillKind)
  kind: SkillKind;

  @ApiProperty({
    required: false,
    default: true,
    description: 'Visible to the whole organization when true; only to its creator when false.',
  })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
