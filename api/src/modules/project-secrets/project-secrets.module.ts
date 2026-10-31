import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { ActivitiesModule } from '@/modules/activities/activities.module';
import { SecretsCryptoService } from '@/shared/services/crypto/secrets-crypto.service';
import { ProjectSecretsController } from './project-secrets.controller';
import { ProjectSecretsService } from './project-secrets.service';

@Module({
  imports: [PrismaModule, ActivitiesModule],
  controllers: [ProjectSecretsController],
  providers: [ProjectSecretsService, SecretsCryptoService],
})
export class ProjectSecretsModule {}
