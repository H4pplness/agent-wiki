import { Injectable } from '@nestjs/common';
import { FilesystemService } from '../../core/filesystem/filesystem.service';

export interface AgentWikiConfig {
  cloudEndpoint: string | null;
  userToken: string | null;
  autoUpdateIndex: boolean;
  logRetentionDays: number;
  defaultWikiDirs: string[];
}

const DEFAULT_CONFIG: AgentWikiConfig = {
  cloudEndpoint: null,
  userToken: null,
  autoUpdateIndex: true,
  logRetentionDays: 90,
  defaultWikiDirs: ['concepts', 'tasks', 'notes'],
};

@Injectable()
export class ConfigService {
  constructor(private readonly fs: FilesystemService) {}

  async getConfig(): Promise<AgentWikiConfig> {
    const configPath = this.fs.getConfigPath();
    if (!(await this.fs.exists(configPath))) {
      await this.fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return { ...DEFAULT_CONFIG };
    }
    const raw = await this.fs.readFile(configPath);
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  }

  async set(key: string, value: string): Promise<void> {
    const config = await this.getConfig();
    (config as any)[key] = this.coerceValue(value);
    const configPath = this.fs.getConfigPath();
    await this.fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  async get(key: string): Promise<string | null> {
    const config = await this.getConfig();
    const val = (config as any)[key];
    return val !== null && val !== undefined ? String(val) : null;
  }

  private coerceValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    return value;
  }
}
