import { ApiProperty } from '@nestjs/swagger';
import { AgentType } from 'generated/prisma';
import {
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePreferencesDto {
  @ApiProperty({
    required: false,
    description: 'Organization selected in the app',
  })
  @IsOptional()
  @IsUUID()
  active_organization_id?: string;

  @ApiProperty({ required: false, enum: AgentType })
  @IsOptional()
  @IsEnum(AgentType)
  preferred_agent?: AgentType;

  @ApiProperty({ required: false, example: 'main' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  default_branch?: string;

  @ApiProperty({
    required: false,
    example: 45,
    description: 'Seconds without output before a session is "awaiting input"',
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(600)
  idle_threshold_seconds?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  confirm_destructive?: boolean;

  @ApiProperty({ required: false, enum: ['dark', 'light', 'system'] })
  @IsOptional()
  @IsIn(['dark', 'light', 'system'])
  theme?: string;

  @ApiProperty({ required: false, example: 'default' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z0-9-]+$/)
  theme_preset?: string;

  @ApiProperty({ required: false, nullable: true, example: '#5b8def' })
  @IsOptional()
  @IsHexColor()
  accent_color?: string | null;

  @ApiProperty({ required: false, example: 14 })
  @IsOptional()
  @IsInt()
  @Min(12)
  @Max(20)
  font_size?: number;

  @ApiProperty({ required: false, example: 'inter' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z0-9-]+$/)
  font_family?: string;

  @ApiProperty({ required: false, example: 'jetbrains-mono' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z0-9-]+$/)
  mono_font_family?: string;

  @ApiProperty({
    required: false,
    description:
      'Partial notification settings: { enabled?, events?: { [EVENT_TYPE]: { badge?, feed?, os?, toast? } } }',
    example: { enabled: true, events: { AGENT_FINISHED: { os: true } } },
  })
  @IsOptional()
  @IsObject()
  notification_settings?: {
    enabled?: boolean;
    events?: Record<string, Partial<Record<string, boolean>>>;
  };

  @ApiProperty({
    required: false,
    description:
      'Complete shortcut settings (replaces the stored value): { bindings: { [ACTION_ID]: combo }, custom: [{ id, name, combo, type, action_id?, prompt? }] }',
    example: {
      bindings: { command_palette: 'mod+shift+k' },
      custom: [
        {
          id: 'c1',
          name: 'Review my diff',
          combo: 'mod+shift+d',
          type: 'ai_prompt',
          prompt: 'Review the uncommitted changes.',
        },
      ],
    },
  })
  @IsOptional()
  @IsObject()
  shortcut_settings?: {
    bindings?: Record<string, string>;
    custom?: unknown[];
  };
}
