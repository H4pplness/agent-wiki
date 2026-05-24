import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { CloudApiService } from './cloud-api.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [SyncService, CloudApiService],
  exports: [SyncService, CloudApiService],
})
export class SyncModule {}
