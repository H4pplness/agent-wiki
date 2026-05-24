import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as lockfile from 'proper-lockfile';
import * as os from 'os';

@Injectable()
export class FilesystemService {
  private readonly baseDir = path.join(os.homedir(), '.agent-wiki');

  getBaseDir(): string {
    return this.baseDir;
  }

  getAgentPath(name: string): string {
    return path.join(this.baseDir, 'agents', name);
  }

  getSchemaPath(name: string): string {
    return path.join(this.getAgentPath(name), 'schema.md');
  }

  getIndexPath(name: string): string {
    return path.join(this.getAgentPath(name), 'index.md');
  }

  getLogPath(name: string): string {
    return path.join(this.getAgentPath(name), 'log.md');
  }

  getConfigPath(): string {
    return path.join(this.baseDir, 'config.json');
  }

  resolveWikiRef(name: string, ref: string): string {
    const safe = path.normalize(ref).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.getAgentPath(name), safe);
  }

  async exists(p: string): Promise<boolean> {
    return fs.pathExists(p);
  }

  async readFile(p: string): Promise<string> {
    return fs.readFile(p, 'utf-8');
  }

  async writeFile(p: string, content: string): Promise<void> {
    return fs.outputFile(p, content);
  }

  async appendFile(p: string, content: string): Promise<void> {
    return fs.appendFile(p, content);
  }

  async deleteFile(p: string): Promise<void> {
    return fs.remove(p);
  }

  async ensureDir(p: string): Promise<void> {
    return fs.ensureDir(p);
  }

  async createAgentDirectory(name: string): Promise<void> {
    await fs.ensureDir(this.getAgentPath(name));
  }

  async listAgentNames(): Promise<string[]> {
    const agentsDir = path.join(this.baseDir, 'agents');
    await fs.ensureDir(agentsDir);
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  }

  async withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
    // proper-lockfile requires the file to exist
    await fs.ensureFile(filePath);
    const release = await lockfile.lock(filePath, {
      retries: { retries: 5, minTimeout: 50 },
    });
    try {
      return await fn();
    } finally {
      await release();
    }
  }
}
