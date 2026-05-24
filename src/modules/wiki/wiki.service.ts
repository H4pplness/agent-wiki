import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { createPromptModule } from 'inquirer';
import { FilesystemService } from '../../core/filesystem/filesystem.service';
import { IndexService, WikiPageEntry } from './index.service';
import { WikiLoggerService } from '../../core/logger/wiki-logger.service';
import { MarkdownService } from '../../core/markdown/markdown.service';
import { generateFrontmatter, stripFrontmatter } from '../../utils/frontmatter.util';

export class NotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WikiPageNotFoundError';
  }
}

export class ConflictException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WikiPageAlreadyExistsError';
  }
}

@Injectable()
export class WikiService {
  constructor(
    private readonly fs: FilesystemService,
    private readonly index: IndexService,
    private readonly logger: WikiLoggerService,
    private readonly markdown: MarkdownService,
  ) {}

  async viewPage(agentName: string, ref: string, raw = false): Promise<string> {
    const filePath = this.fs.resolveWikiRef(agentName, ref);
    if (!(await this.fs.exists(filePath))) {
      throw new NotFoundException(`Trang wiki không tồn tại: ${ref}`);
    }
    const content = await this.fs.readFile(filePath);
    return raw ? content : stripFrontmatter(content);
  }

  async createPage(agentName: string, ref: string, title?: string): Promise<void> {
    const filePath = this.fs.resolveWikiRef(agentName, ref);
    if (await this.fs.exists(filePath)) {
      throw new ConflictException(`Trang wiki đã tồn tại: ${ref}`);
    }
    const t = title ?? this.markdown.inferTitle(ref);
    const category = this.markdown.inferCategory(ref);
    const template = generateFrontmatter(t, category);

    await this.fs.ensureDir(path.dirname(filePath));
    await this.fs.writeFile(filePath, template);
    await this.index.addEntry(agentName, ref, t);
    await this.logger.log(agentName, 'create', `Tạo trang: ${ref}`);
  }

  async deletePage(agentName: string, ref: string, confirm = false): Promise<void> {
    const filePath = this.fs.resolveWikiRef(agentName, ref);
    if (!(await this.fs.exists(filePath))) {
      throw new NotFoundException(`Trang wiki không tồn tại: ${ref}`);
    }
    if (!confirm) {
      const prompt = createPromptModule();
      const { ok } = await prompt([
        {
          type: 'confirm',
          name: 'ok',
          message: `Xác nhận xóa ${ref}?`,
          default: false,
        },
      ]);
      if (!ok) return;
    }
    await this.fs.deleteFile(filePath);
    await this.index.removeEntry(agentName, ref);
    await this.logger.log(agentName, 'delete', `Xóa trang: ${ref}`);
  }

  async listPages(agentName: string, prefix?: string): Promise<WikiPageEntry[]> {
    const all = await this.index.getAll(agentName);
    return prefix ? all.filter((e) => e.ref.startsWith(prefix)) : all;
  }

  async printLog(agentName: string, tail = 20): Promise<string> {
    const logPath = this.fs.getLogPath(agentName);
    if (!(await this.fs.exists(logPath))) {
      return 'Chưa có log entry nào.';
    }
    const content = await this.fs.readFile(logPath);
    const entries = content
      .split('\n## [')
      .filter((e) => e.trim());
    const recent = entries.slice(-tail);
    return recent.map((e) => (e.startsWith('## [') ? e : `## [${e}`)).join('\n');
  }
}
