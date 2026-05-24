#!/usr/bin/env node
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WikiCliService } from './commands/wiki-cli.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const cli = app.get(WikiCliService);
  await cli.run(process.argv);

  await app.close();
}

bootstrap();
