import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { AppReleasesController } from './app-releases.controller';
import { AppReleasesService } from './app-releases.service';
import { ReleaseTokenGuard } from './guards/release-token.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AppReleasesController],
  providers: [AppReleasesService, ReleaseTokenGuard],
})
export class AppReleasesModule {}
