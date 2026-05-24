import { Module } from '@nestjs/common';
import { FilesystemModule } from './core/filesystem/filesystem.module';
import { WikiLoggerModule } from './core/logger/wiki-logger.module';
import { MarkdownModule } from './core/markdown/markdown.module';
import { WikiModule } from './modules/wiki/wiki.module';
import { SyncModule } from './modules/sync/sync.module';
import { ConfigModule } from './modules/config/config.module';
import { WikiCliService } from './commands/wiki-cli.service';

@Module({
  imports: [
    FilesystemModule,
    WikiLoggerModule,
    MarkdownModule,
    WikiModule,
    SyncModule,
    ConfigModule,
  ],
  providers: [WikiCliService],
})
export class AppModule {}
