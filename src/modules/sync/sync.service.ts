import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FilesystemService } from '../../core/filesystem/filesystem.service';
import { CloudApiService } from './cloud-api.service';

@Injectable()
export class SyncService {
  constructor(
    private readonly fs: FilesystemService,
    private readonly cloud: CloudApiService,
  ) {}

  async syncAgent(agentName: string): Promise<{ message: string }> {
    const agentPath = this.fs.getAgentPath(agentName);
    if (!(await this.fs.exists(agentPath))) {
      throw new Error(`Agent "${agentName}" không tồn tại.`);
    }

    try {
      const status = await this.cloud.getAgentStatus(agentName);
      if (!status.exists) {
        await this.cloud.initAgent(agentName);
      }
      const files = await this.gatherFiles(agentName);
      for (const file of files) {
        const content = await this.fs.readFile(file.localPath);
        await this.cloud.putFile(agentName, file.cloudPath, content);
      }
      return { message: `Đã đồng bộ ${files.length} files.` };
    } catch (err) {
      if (err instanceof Error && err.name === 'CloudSyncUnauthorizedError') {
        throw err;
      }
      throw new Error(`Đồng bộ thất bại: ${(err as Error).message}`);
    }
  }

  async syncAll(): Promise<string[]> {
    const names = await this.fs.listAgentNames();
    const results: string[] = [];
    for (const name of names) {
      try {
        const r = await this.syncAgent(name);
        results.push(`${name}: ${r.message}`);
      } catch (err) {
        results.push(`${name}: LỖI — ${(err as Error).message}`);
      }
    }
    return results;
  }

  private async gatherFiles(
    agentName: string,
  ): Promise<{ localPath: string; cloudPath: string }[]> {
    const agentPath = this.fs.getAgentPath(agentName);
    const files: { localPath: string; cloudPath: string }[] = [];
    await this.walk(agentPath, agentPath, files);
    return files;
  }

  private async walk(
    dir: string,
    base: string,
    files: { localPath: string; cloudPath: string }[],
  ): Promise<void> {
    if (!(await this.fs.exists(dir))) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(base, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        await this.walk(fullPath, base, files);
      } else if (entry.name.endsWith('.md')) {
        files.push({ localPath: fullPath, cloudPath: relativePath });
      }
    }
  }
}
