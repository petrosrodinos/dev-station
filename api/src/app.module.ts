import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './shared/config/env/env.module';
import { RedisModule } from './core/databases/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AgentSessionsModule } from './modules/agent-sessions/agent-sessions.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { GitIdentitiesModule } from './modules/git-identities/git-identities.module';
import { AccessModule } from './shared/services/access/access.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    AccessModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    IntegrationsModule,
    AgentsModule,
    AgentSessionsModule,
    ActivitiesModule,
    GitIdentitiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
