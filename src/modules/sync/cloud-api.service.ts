import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import axios, { AxiosInstance } from 'axios';

export interface CloudAgentStatus {
  name: string;
  exists: boolean;
  fileCount: number;
  lastSync: string;
}

export interface CloudFileInfo {
  path: string;
  checksum: string;
  updated: string;
}

@Injectable()
export class CloudApiService {
  private client: AxiosInstance | null = null;

  constructor(private readonly config: ConfigService) {}

  private async getClient(): Promise<AxiosInstance> {
    if (this.client) return this.client;

    const cfg = await this.config.getConfig();
    if (!cfg.cloudEndpoint || !cfg.userToken) {
      throw new CloudSyncUnauthorizedError(
        'Thiếu cloud endpoint hoặc user token. Dùng "agent-wiki config set" để thiết lập.',
      );
    }

    this.client = axios.create({
      baseURL: cfg.cloudEndpoint,
      headers: {
        Authorization: `Bearer ${cfg.userToken}`,
        'Content-Type': 'application/json',
      },
    });

    return this.client;
  }

  async getAgentStatus(agentName: string): Promise<CloudAgentStatus> {
    const client = await this.getClient();
    const { data } = await client.get(`/api/agents/${agentName}/status`);
    return data;
  }

  async getFileList(agentName: string): Promise<CloudFileInfo[]> {
    const client = await this.getClient();
    const { data } = await client.get(`/api/agents/${agentName}/files`);
    return data;
  }

  async getFile(agentName: string, filePath: string): Promise<string> {
    const client = await this.getClient();
    const { data } = await client.get(
      `/api/agents/${agentName}/files/${encodeURIComponent(filePath)}`,
    );
    return data;
  }

  async putFile(agentName: string, filePath: string, content: string): Promise<void> {
    const client = await this.getClient();
    await client.put(
      `/api/agents/${agentName}/files/${encodeURIComponent(filePath)}`,
      { content },
    );
  }

  async initAgent(agentName: string): Promise<void> {
    const client = await this.getClient();
    await client.post(`/api/agents/${agentName}/init`);
  }
}

export class CloudSyncUnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudSyncUnauthorizedError';
  }
}
