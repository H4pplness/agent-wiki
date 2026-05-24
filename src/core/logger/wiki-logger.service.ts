import { Injectable } from '@nestjs/common';
import { FilesystemService } from '../filesystem/filesystem.service';

@Injectable()
export class WikiLoggerService {
  constructor(private readonly fs: FilesystemService) {}

  async log(agentName: string, op: string, message: string): Promise<void> {
    const logPath = this.fs.getLogPath(agentName);
    const ts = new Date().toISOString().replace('T', ' ').split('.')[0];
    const entry = `\n## [${ts}] ${op} | ${message}\n`;
    await this.fs.withLock(logPath, () => this.fs.appendFile(logPath, entry));
  }
}
