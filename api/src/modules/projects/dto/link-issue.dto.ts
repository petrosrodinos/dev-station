import { ApiProperty } from '@nestjs/swagger';
import { IntegrationProvider } from 'generated/prisma';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LinkIssueDto {
  @ApiProperty({ enum: IntegrationProvider })
  @IsEnum(IntegrationProvider)
  provider: IntegrationProvider;

  @ApiProperty({ description: 'Issue id at the provider' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  external_id: string;

  @ApiProperty({ required: false, example: 'LIN-234' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  key?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;
}
