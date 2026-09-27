import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { ActivitiesModule } from '@/modules/activities/activities.module';
import { AgentSessionsController } from './agent-sessions.controller';
import { AgentSessionsService } from './agent-sessions.service';

@Module({
  imports: [PrismaModule, ActivitiesModule],
  controllers: [AgentSessionsController],
  providers: [AgentSessionsService],
})
export class AgentSessionsModule {}
