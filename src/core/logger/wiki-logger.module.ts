import { Global, Module } from '@nestjs/common';
import { WikiLoggerService } from './wiki-logger.service';

@Global()
@Module({
  providers: [WikiLoggerService],
  exports: [WikiLoggerService],
})
export class WikiLoggerModule {}
