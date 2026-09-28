import { PartialType } from '@nestjs/swagger';
import { CreateGitIdentityDto } from './create-git-identity.dto';

export class UpdateGitIdentityDto extends PartialType(CreateGitIdentityDto) {}
