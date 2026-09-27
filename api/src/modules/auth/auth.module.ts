import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { CreateJwtServiceModule } from '@/shared/utils/jwt/jwt.module';
import { ResendModule } from '@/integrations/notifications/resend/resend.module';
import { EmailAuthService } from './services/email.service';
import { EmailAuthController } from './controllers/email.controller';
import { PasswordService } from './services/password.service';
import { PasswordController } from './controllers/password.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PrismaModule, CreateJwtServiceModule, ResendModule],
  providers: [EmailAuthService, PasswordService, JwtStrategy],
  controllers: [EmailAuthController, PasswordController],
})
export class AuthModule {}
