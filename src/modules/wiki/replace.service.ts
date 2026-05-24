import { Injectable } from '@nestjs/common';
import { FilesystemService } from '../../core/filesystem/filesystem.service';
import { WikiLoggerService } from '../../core/logger/wiki-logger.service';
import { computeDiff } from '../../utils/diff.util';

export interface ReplaceResult {
  success: boolean;
  count: number;
  dryRun?: boolean;
  diff?: string;
  message?: string;
}

@Injectable()
export class ReplaceService {
  constructor(
    private readonly fs: FilesystemService,
    private readonly logger: WikiLoggerService,
  ) {}

  async replace(
    agentName: string,
    target: string,
    oldStr: string,
    newStr: string,
    opts: { replaceAll?: boolean; dryRun?: boolean } = {},
  ): Promise<ReplaceResult> {
    const filePath =
      target === 'schema'
        ? this.fs.getSchemaPath(agentName)
        : this.fs.resolveWikiRef(agentName, target);

    if (!(await this.fs.exists(filePath))) {
      return { success: false, count: 0, message: `File không tồn tại: ${target}` };
    }

    const content = await this.fs.readFile(filePath);

    if (!content.includes(oldStr)) {
      return {
        success: false,
        count: 0,
        message: 'Không tìm thấy chuỗi cần thay thế.',
      };
    }

    const newContent = opts.replaceAll
      ? content.split(oldStr).join(newStr)
      : content.replace(oldStr, newStr);

    const count = opts.replaceAll
      ? content.split(oldStr).length - 1
      : 1;

    if (opts.dryRun) {
      return {
        success: true,
        count,
        dryRun: true,
        diff: computeDiff(content, newContent),
      };
    }

    await this.fs.withLock(filePath, async () => {
      await this.fs.writeFile(filePath, newContent);
    });

    await this.logger.log(
      agentName,
      'replace',
      `${target}: "${oldStr}" → "${newStr}" (${count} lần)`,
    );

    return { success: true, count };
  }
}
