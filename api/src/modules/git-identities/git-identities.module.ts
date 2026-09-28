import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { GitIdentitiesController } from './git-identities.controller';
import { GitIdentitiesService } from './git-identities.service';

@Module({
  imports: [PrismaModule],
  controllers: [GitIdentitiesController],
  providers: [GitIdentitiesService],
})
export class GitIdentitiesModule {}
