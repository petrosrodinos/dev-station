import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ComposioService } from './services/composio.service';

@Module({
  imports: [ConfigModule],
  providers: [ComposioService],
  exports: [ComposioService],
})
export class ComposioModule {}
