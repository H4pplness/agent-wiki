import { Global, Module } from '@nestjs/common';
import { MarkdownService } from './markdown.service';

@Global()
@Module({
  providers: [MarkdownService],
  exports: [MarkdownService],
})
export class MarkdownModule {}
