import { Injectable } from '@nestjs/common';
import { FilesystemService } from '../../core/filesystem/filesystem.service';

export interface WikiPageEntry {
  ref: string;
  title: string;
  updated: string;
}

@Injectable()
export class IndexService {
  constructor(private readonly fs: FilesystemService) {}

  async getAll(agentName: string): Promise<WikiPageEntry[]> {
    const indexPath = this.fs.getIndexPath(agentName);
    if (!(await this.fs.exists(indexPath))) {
      return [];
    }
    const content = await this.fs.readFile(indexPath);
    return this.parseIndex(content);
  }

  async addEntry(agentName: string, ref: string, title: string): Promise<void> {
    const indexPath = this.fs.getIndexPath(agentName);
    const now = new Date().toISOString().split('T')[0];
    const entry = `- [${title}](${ref}) | ${now}\n`;

    await this.fs.withLock(indexPath, async () => {
      if (!(await this.fs.exists(indexPath))) {
        await this.fs.writeFile(indexPath, `# Index — ${agentName}\n\n`);
      }
      await this.fs.appendFile(indexPath, entry);
    });
  }

  async removeEntry(agentName: string, ref: string): Promise<void> {
    const indexPath = this.fs.getIndexPath(agentName);
    await this.fs.withLock(indexPath, async () => {
      const content = await this.fs.readFile(indexPath);
      const updated = content
        .split('\n')
        .filter((line) => !line.includes(`(${ref})`))
        .join('\n');
      await this.fs.writeFile(indexPath, updated);
    });
  }

  async rebuild(agentName: string, entries: WikiPageEntry[]): Promise<void> {
    const indexPath = this.fs.getIndexPath(agentName);
    const lines = [`# Index — ${agentName}`, ''];
    for (const entry of entries) {
      lines.push(`- [${entry.title}](${entry.ref}) | ${entry.updated}`);
    }
    lines.push('');
    await this.fs.writeFile(indexPath, lines.join('\n'));
  }

  private parseIndex(content: string): WikiPageEntry[] {
    const entries: WikiPageEntry[] = [];
    const regex = /^- \[(.+?)\]\((.+?)\) \| (.+)$/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
      entries.push({
        title: match[1],
        ref: match[2],
        updated: match[3],
      });
    }
    return entries;
  }
}
