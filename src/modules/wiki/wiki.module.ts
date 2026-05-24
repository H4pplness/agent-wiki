import { Module } from '@nestjs/common';
import { WikiService } from './wiki.service';
import { SchemaService } from './schema.service';
import { IndexService } from './index.service';
import { ReplaceService } from './replace.service';

@Module({
  providers: [WikiService, SchemaService, IndexService, ReplaceService],
  exports: [WikiService, SchemaService, IndexService, ReplaceService],
})
export class WikiModule {}
