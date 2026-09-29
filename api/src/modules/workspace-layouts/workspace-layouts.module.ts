import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { WorkspaceLayoutsController } from './workspace-layouts.controller';
import { WorkspaceLayoutsService } from './workspace-layouts.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkspaceLayoutsController],
  providers: [WorkspaceLayoutsService],
  exports: [WorkspaceLayoutsService],
})
export class WorkspaceLayoutsModule {}
