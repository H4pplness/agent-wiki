import { Injectable } from '@nestjs/common';
import { FilesystemService } from '../../core/filesystem/filesystem.service';

export interface WikiPageEntry {
  ref: string;
  title: string;
  updated: string;
}

function buildEmptyIndex(agentName: string): string {
  return `# Index — ${agentName}\n\n`;
}

const ROW_REGEX = /^\| \[\[(.+?)\]\] \| (.+?) \|$/;

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
    const folder = ref.split('/')[1] ?? 'notes';
    const sectionHeader = `### ${folder}/`;
    const row = `| [[${ref}]] | ${title} |`;

    const indexPath = this.fs.getIndexPath(agentName);

    await this.fs.withLock(indexPath, async () => {
      let content: string;
      if (!(await this.fs.exists(indexPath))) {
        content = buildEmptyIndex(agentName);
      } else {
        content = await this.fs.readFile(indexPath);
      }

      if (content.includes(sectionHeader)) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i] === sectionHeader) {
            lines.splice(i + 2, 0, row);
            break;
          }
        }
        content = lines.join('\n');
      } else {
        content += `\n${sectionHeader}\n| Trang | Trả lời câu hỏi |\n|-------|-----------------|\n${row}\n`;
      }

      await this.fs.writeFile(indexPath, content);
    });
  }

  async removeEntry(agentName: string, ref: string): Promise<void> {
    const indexPath = this.fs.getIndexPath(agentName);
    await this.fs.withLock(indexPath, async () => {
      const content = await this.fs.readFile(indexPath);
      const updated = content
        .split('\n')
        .filter((line) => !line.includes(`[[${ref}]]`))
        .join('\n');
      await this.fs.writeFile(indexPath, updated);
    });
  }

  async rebuild(agentName: string, entries: WikiPageEntry[]): Promise<void> {
    const groups = new Map<string, WikiPageEntry[]>();
    for (const entry of entries) {
      const folder = entry.ref.split('/')[1] ?? 'notes';
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder)!.push(entry);
    }

    const lines = [`# Index — ${agentName}`, ''];
    for (const folder of groups.keys()) {
      lines.push(`### ${folder}/`);
      lines.push('| Trang | Trả lời câu hỏi |');
      lines.push('|-------|-----------------|');
      const folderEntries = groups.get(folder) ?? [];
      for (const entry of folderEntries) {
        lines.push(`| [[${entry.ref}]] | ${entry.title} |`);
      }
      lines.push('');
    }
    await this.fs.writeFile(this.fs.getIndexPath(agentName), lines.join('\n'));
  }

  private parseIndex(content: string): WikiPageEntry[] {
    const entries: WikiPageEntry[] = [];
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(ROW_REGEX);
      if (match) {
        entries.push({ ref: match[1], title: match[2], updated: '' });
      }
    }
    return entries;
  }
}
