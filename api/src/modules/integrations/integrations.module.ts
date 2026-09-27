import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { ComposioModule } from '@/integrations/composio/composio.module';
import { ActivitiesModule } from '@/modules/activities/activities.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsCallbackController } from './integrations-callback.controller';
import { IntegrationsService } from './integrations.service';
import { GithubIntegrationService } from './services/github-integration.service';
import { LinearIntegrationService } from './services/linear-integration.service';
import { NotionIntegrationService } from './services/notion-integration.service';

@Module({
  imports: [PrismaModule, ComposioModule, ActivitiesModule],
  controllers: [IntegrationsController, IntegrationsCallbackController],
  providers: [
    IntegrationsService,
    GithubIntegrationService,
    LinearIntegrationService,
    NotionIntegrationService,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
