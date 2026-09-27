import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { ResendModule } from '@/integrations/notifications/resend/resend.module';
import {
  CurrentOrganizationController,
  OrganizationsController,
} from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [PrismaModule, ResendModule],
  controllers: [OrganizationsController, CurrentOrganizationController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
