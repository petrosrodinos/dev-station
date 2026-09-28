import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { AccessService } from './access.service';
import { MembershipService } from './membership.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [MembershipService, AccessService],
  exports: [MembershipService, AccessService],
})
export class AccessModule {}
