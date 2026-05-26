import { Injectable } from '@nestjs/common';
import { Command } from 'commander';
import { Chalk } from 'chalk';
import { SchemaService } from '../modules/wiki/schema.service';
import { WikiService } from '../modules/wiki/wiki.service';
import { ReplaceService } from '../modules/wiki/replace.service';
import { SyncService } from '../modules/sync/sync.service';
import { ConfigService } from '../modules/config/config.service';
import { FilesystemService } from '../core/filesystem/filesystem.service';
import { WikiLoggerService } from '../core/logger/wiki-logger.service';
import { validateAgentName, validateRef } from '../utils/path.util';

const chalk = new Chalk();

const AGENT_COMMANDS = ['schema', 'view', 'create', 'delete', 'replace', 'list', 'log', 'sync'];
const GLOBAL_COMMANDS = ['agents', 'sync-all', 'config'];

@Injectable()
export class WikiCliService {
  constructor(
    private readonly schemaService: SchemaService,
    private readonly wikiService: WikiService,
    private readonly replaceService: ReplaceService,
    private readonly syncService: SyncService,
    private readonly configService: ConfigService,
    private readonly fs: FilesystemService,
    private readonly logger: WikiLoggerService,
  ) {}

  async run(argv: string[]): Promise<void> {
    argv = this.normalizeArgv(argv);
    const program = new Command();

    program
      .name('agent-wiki')
      .description('Agent Wiki CLI — knowledge base cho AI agents')
      .version('2.0.0');

    // agent-wiki <agent-name> schema
    program
      .command('schema <agent-name>')
      .description('Hiển thị schema của agent. Auto-init nếu chưa tồn tại.')
      .action(async (agentName: string) => {
        this.validateAgent(agentName);
        await this.ensureAgent(agentName);
        const schema = await this.schemaService.getSchema(agentName);
        console.log(schema);
      });

    // agent-wiki <agent-name> view <ref>
    program
      .command('view <agent-name> <ref>')
      .description('Đọc nội dung một wiki page')
      .option('--raw', 'Hiển thị kèm YAML frontmatter', false)
      .action(async (agentName: string, ref: string, opts: { raw: boolean }) => {
        this.validateAgent(agentName);
        this.validateRefStr(ref);
        await this.ensureAgent(agentName);
        try {
          const content = await this.wikiService.viewPage(agentName, ref, opts.raw);
          console.log(content);
        } catch (err) {
          this.exitErr(err, 1);
        }
      });

    // agent-wiki <agent-name> create <ref>
    program
      .command('create <agent-name> <ref>')
      .description('Tạo wiki page mới')
      .option('--title <title>', 'Đặt title trong frontmatter')
      .action(async (agentName: string, ref: string, opts: { title?: string }) => {
        this.validateAgent(agentName);
        this.validateRefStr(ref);
        await this.ensureAgent(agentName);
        try {
          await this.wikiService.createPage(agentName, ref, opts.title);
          console.log(chalk.green(`[OK] Đã tạo trang: ${ref}`));
        } catch (err) {
          this.exitErr(err, 1);
        }
      });

    // agent-wiki <agent-name> delete <ref>
    program
      .command('delete <agent-name> <ref>')
      .description('Xóa wiki page')
      .option('--confirm', 'Bỏ qua prompt xác nhận', false)
      .action(async (agentName: string, ref: string, opts: { confirm: boolean }) => {
        this.validateAgent(agentName);
        await this.ensureAgent(agentName);
        try {
          await this.wikiService.deletePage(agentName, ref, opts.confirm);
          console.log(chalk.green(`[OK] Đã xóa trang: ${ref}`));
        } catch (err) {
          this.exitErr(err, 1);
        }
      });

    // agent-wiki <agent-name> replace <target> <old> <new>
    program
      .command('replace <agent-name> <target> <old-str> <new-str>')
      .description('Thay thế chuỗi trong file. target = "schema" hoặc địa-chỉ-tham-chiếu')
      .option('--all', 'Thay thế tất cả lần xuất hiện', false)
      .option('--dry-run', 'Hiển thị diff mà không ghi file', false)
      .action(async (
        agentName: string,
        target: string,
        oldStr: string,
        newStr: string,
        opts: { all: boolean; dryRun: boolean },
      ) => {
        this.validateAgent(agentName);
        await this.ensureAgent(agentName);
        const result = await this.replaceService.replace(agentName, target, oldStr, newStr, {
          replaceAll: opts.all,
          dryRun: opts.dryRun,
        });

        if (!result.success) {
          console.error(chalk.red(`Error: ${result.message}`));
          process.exit(1);
        }

        if (result.dryRun && result.diff) {
          console.log(chalk.cyan('--- Dry run diff ---'));
          console.log(result.diff);
        } else {
          console.log(chalk.green(`[OK] Đã thay thế ${result.count} lần.`));
        }
      });

    // agent-wiki <agent-name> list [prefix]
    program
      .command('list <agent-name> [prefix]')
      .description('Liệt kê wiki pages')
      .option('--json', 'Output dạng JSON', false)
      .action(async (agentName: string, prefix: string | undefined, opts: { json: boolean }) => {
        this.validateAgent(agentName);
        await this.ensureAgent(agentName);
        const pages = await this.wikiService.listPages(agentName, prefix);

        if (opts.json) {
          console.log(JSON.stringify(pages, null, 2));
          return;
        }

        if (pages.length === 0) {
          console.log('Chưa có trang wiki nào.');
          return;
        }

        for (const page of pages) {
          console.log(`${page.ref} | ${page.title} | ${page.updated}`);
        }
      });

    // agent-wiki <agent-name> log
    program
      .command('log <agent-name>')
      .description('Xem lịch sử hoạt động')
      .option('--tail <n>', 'Số entry gần nhất', '20')
      .option('--json', 'Output dạng JSON', false)
      .action(async (agentName: string, opts: { tail: string; json: boolean }) => {
        this.validateAgent(agentName);
        await this.ensureAgent(agentName);
        const tail = parseInt(opts.tail, 10) || 20;
        const content = await this.wikiService.printLog(agentName, tail);

        if (opts.json) {
          console.log(JSON.stringify({ log: content }, null, 2));
          return;
        }

        console.log(content);
      });

    // agent-wiki <agent-name> sync
    program
      .command('sync <agent-name>')
      .description('Đồng bộ wiki của agent lên cloud')
      .action(async (agentName: string) => {
        try {
          const result = await this.syncService.syncAgent(agentName);
          console.log(chalk.green(`[OK] ${result.message}`));
        } catch (err) {
          this.exitErr(err, 4);
        }
      });

    // agent-wiki agents
    program
      .command('agents')
      .description('Liệt kê tất cả agents')
      .option('--json', 'Output dạng JSON', false)
      .action(async (opts: { json: boolean }) => {
        const names = await this.fs.listAgentNames();
        const agents = [];

        for (const name of names) {
          try {
            const indexPath = this.fs.getIndexPath(name);
            let pageCount = 0;
            if (await this.fs.exists(indexPath)) {
              const index = await this.fs.readFile(indexPath);
              pageCount = (index.match(/^- /gm) ?? []).length;
            }
            let initDate = 'unknown';
            const logPath = this.fs.getLogPath(name);
            if (await this.fs.exists(logPath)) {
              const log = await this.fs.readFile(logPath);
              initDate = log.match(/\[(\d{4}-\d{2}-\d{2})/)?.[1] ?? 'unknown';
            }
            agents.push({ name, initDate, pageCount });
          } catch {
            agents.push({ name, initDate: 'unknown', pageCount: 0 });
          }
        }

        if (opts.json) {
          console.log(JSON.stringify(agents, null, 2));
          return;
        }

        if (agents.length === 0) {
          console.log('Chưa có agent nào. Tạo agent đầu tiên với: agent-wiki schema <name>');
          return;
        }

        for (const agent of agents) {
          console.log(`${agent.name} | init: ${agent.initDate} | pages: ${agent.pageCount}`);
        }
      });

    // agent-wiki sync-all (separate from sync <agent-name>)
    program
      .command('sync-all')
      .description('Đồng bộ toàn bộ agents lên cloud')
      .action(async () => {
        try {
          const results = await this.syncService.syncAll();
          for (const line of results) {
            console.log(line);
          }
        } catch (err) {
          this.exitErr(err, 4);
        }
      });

    // agent-wiki config
    const configCmd = program
      .command('config <action>')
      .description('Quản lý cấu hình (set, get, list)');

    configCmd
      .command('set <key> <value>')
      .description('Thiết lập một giá trị cấu hình')
      .action(async (key: string, value: string) => {
        await this.configService.set(key, value);
        console.log(chalk.green(`[OK] Đã set ${key} = ${value}`));
      });

    configCmd
      .command('get <key>')
      .description('Xem một giá trị cấu hình')
      .action(async (key: string) => {
        const val = await this.configService.get(key);
        console.log(val ?? '(null)');
      });

    configCmd
      .command('list')
      .description('Xem toàn bộ cấu hình')
      .action(async () => {
        const config = await this.configService.getConfig();
        console.log(JSON.stringify(config, null, 2));
      });

    await program.parseAsync(argv);

    // If no command matched, show help
    if (argv.length <= 2) {
      program.outputHelp();
    }
  }

  // --- Helpers ---

  /**
   * Normalize argv so both syntax forms work:
   *   agent-wiki <agent-name> <command> [args]   (design doc / SKILL.md format)
   *   agent-wiki <command> <agent-name> [args]   (legacy format)
   *
   * If argv[2] is not a known command, it is treated as an agent name
   * and swapped with argv[3] (the actual command).
   */
  private normalizeArgv(argv: string[]): string[] {
    if (argv.length <= 2) return argv;

    const firstArg = argv[2];

    // Already a known command — nothing to do
    if (AGENT_COMMANDS.includes(firstArg) || GLOBAL_COMMANDS.includes(firstArg)) {
      return argv;
    }

    // firstArg looks like an agent name — swap with the next positional arg
    if (argv.length >= 4) {
      // agent-wiki my-agent schema ...rest → agent-wiki schema my-agent ...rest
      return [argv[0], argv[1], argv[3], argv[2], ...argv.slice(4)];
    }

    return argv;
  }

  private validateAgent(name: string): void {
    const result = validateAgentName(name);
    if (result !== true) {
      console.error(chalk.red(`Error: ${result}`));
      process.exit(2);
    }
  }

  private validateRefStr(ref: string): void {
    const result = validateRef(ref);
    if (result !== true) {
      console.error(chalk.red(`Error: ${result}`));
      process.exit(2);
    }
  }

  private async ensureAgent(agentName: string): Promise<void> {
    const agentPath = this.fs.getAgentPath(agentName);
    if (!(await this.fs.exists(agentPath))) {
      await this.initializeAgent(agentName);
      console.log(chalk.green(`[INFO] Wiki mới khởi tạo cho agent: ${agentName}\n`));
    }
  }

  private async initializeAgent(agentName: string): Promise<void> {
    await this.fs.createAgentDirectory(agentName);
    await this.schemaService.createDefaultSchema(agentName);
    await this.fs.writeFile(
      this.fs.getIndexPath(agentName),
      `# Index — ${agentName}\n\n`,
    );
    await this.logger.log(agentName, 'init', `Wiki khởi tạo cho agent: ${agentName}`);
    for (const dir of ['concepts', 'tasks', 'notes']) {
      await this.fs.ensureDir(
        this.fs.resolveWikiRef(agentName, `wiki/${dir}`),
      );
    }
  }

  private exitErr(err: unknown, code: number): never {
    console.error(chalk.red(`Error: ${(err as Error).message}`));
    process.exit(code);
  }
}
