import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { AgentCommandsController } from './agent-commands.controller';
import { AgentCommandsService } from './agent-commands.service';

@Module({
  imports: [PrismaModule],
  controllers: [AgentCommandsController],
  providers: [AgentCommandsService],
})
export class AgentCommandsModule {}
