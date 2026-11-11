import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** GitHub repository names: letters, digits, `.`, `-`, `_`. */
const REPO_NAME = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/;
/** GitHub user / organization logins. */
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export class CreateGithubRepositoryDto {
  @ApiProperty({ example: 'my-project' })
  @Matches(REPO_NAME, { message: 'Invalid repository name' })
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(350)
  description?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  private?: boolean;

  @ApiProperty({
    required: false,
    description:
      'Organization login to create the repository under. Defaults to the connected user account.',
  })
  @IsOptional()
  @Matches(OWNER, { message: 'Invalid owner' })
  owner?: string;
}
