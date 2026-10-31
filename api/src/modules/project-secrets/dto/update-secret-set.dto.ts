import { PartialType } from '@nestjs/swagger';
import { CreateSecretSetDto } from './create-secret-set.dto';

export class UpdateSecretSetDto extends PartialType(CreateSecretSetDto) {}
