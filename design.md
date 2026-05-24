# Agent Wiki CLI — Tài liệu Thiết kế

**Phiên bản:** 2.0.0
**Công nghệ:** NestJS (CLI), TypeScript
**Ngày:** 2026-05-24

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Mô hình phối hợp Multi-Agent](#2-mô-hình-phối-hợp-multi-agent)
3. [Kiến trúc tổng thể](#3-kiến-trúc-tổng-thể)
4. [Cấu trúc File System](#4-cấu-trúc-file-system)
5. [Schema Layer](#5-schema-layer)
6. [Wiki Layer](#6-wiki-layer)
7. [CLI Commands](#7-cli-commands)
8. [Đồng bộ Cloud](#8-đồng-bộ-cloud)
9. [Module Structure (NestJS)](#9-module-structure-nestjs)
10. [Chi tiết từng Module](#10-chi-tiết-từng-module)
11. [Error Handling & Validation](#11-error-handling--validation)
12. [Configuration](#12-configuration)

---

## 1. Tổng quan hệ thống

Agent Wiki là một CLI knowledge base platform cho phép nhiều AI agent chạy đồng thời trên cùng một máy local, mỗi agent duy trì kho tri thức chuyên môn riêng biệt của mình.

### Bài toán

Khi nhiều AI agent phối hợp trong một hệ thống, mỗi agent cần ngữ cảnh chuyên môn để hoạt động hiệu quả. Tuy nhiên, các agent thường chạy trong các môi trường tách biệt nhau — process khác nhau, MCP server khác nhau, container khác nhau — và không có cơ chế chia sẻ context tự nhiên. Agent Wiki giải quyết bài toán này bằng cách cung cấp một shared file system mà tất cả các agent đều có thể truy cập thông qua cùng một CLI binary, không cần microservice hay network call nội bộ.

### Nguyên tắc thiết kế

**Stateless hoàn toàn.** Mỗi lệnh CLI là một transaction độc lập, tự mang đủ context qua `agent-name`. Không có session, không có trạng thái giữa các lần gọi.

**Agent-name là định danh duy nhất.** Không cần đăng nhập hay xác thực. Tên agent xác định kho tri thức nào được truy cập. Nếu tên chưa tồn tại, wiki được khởi tạo tự động tại lần gọi đầu tiên.

**Tri thức đã được tổng hợp.** Không có lớp raw sources. Agent chịu trách nhiệm tổng hợp và đưa kiến thức đã xử lý vào wiki. Toàn bộ nội dung biểu diễn dưới dạng Markdown.

**Local-first.** Toàn bộ dữ liệu lưu trên máy local. Đồng bộ cloud là tính năng tùy chọn do người dùng quyết định.

**Đọc chéo tự do.** Agent A có thể đọc wiki của agent B bằng cách chỉ định đúng `agent-name`. Phối hợp diễn ra qua shared file system, không qua API nội bộ.

---

## 2. Mô hình phối hợp Multi-Agent

### Topo hệ thống

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Máy Local (Host)                            │
│                                                                      │
│  ┌─────────────────┐   ┌──────────────────┐   ┌───────────────────┐  │
│  │  Orchestrator   │   │  Code Reviewer   │   │  Data Analyst    │  │
│  │  (MCP Server)   │   │  (subprocess)    │   │  (process)       │  │
│  └────────┬────────┘   └────────┬─────────┘   └────────┬──────────┘  │
│           │                    │                       │              │
│           │  agent-wiki        │  agent-wiki           │  agent-wiki  │
│           │  orchestrator ...  │  code-reviewer ...    │  data-analyst│
│           │                    │                       │              │
│           └────────────────────┴───────────────────────┘              │
│                                        │                              │
│                                        ▼                              │
│                    ┌───────────────────────────────────┐              │
│                    │     ~/.agent-wiki/agents/         │              │
│                    │                                   │              │
│                    │  orchestrator/                    │              │
│                    │    schema.md                      │              │
│                    │    wiki/tasks/queue.md            │              │
│                    │                                   │              │
│                    │  code-reviewer/                   │              │
│                    │    schema.md                      │              │
│                    │    wiki/rules/style-guide.md      │              │
│                    │                                   │              │
│                    │  data-analyst/                    │              │
│                    │    schema.md                      │              │
│                    │    wiki/reports/q2.md             │              │
│                    └───────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────────┘
```

### Các pattern phối hợp điển hình

**Agent đọc context của agent khác.**
Orchestrator cần biết code-reviewer đang áp dụng những quy tắc nào:

```bash
agent-wiki code-reviewer view wiki/rules/style-guide.md
```

Orchestrator gọi lệnh trên như một subprocess và nhận nội dung qua stdout.

**Orchestrator cập nhật task queue, agent khác đọc.**

```bash
# Orchestrator đánh dấu task hoàn thành
agent-wiki orchestrator replace wiki/tasks/queue.md "- [ ] Review PR#42" "- [x] Review PR#42"

# Code-reviewer poll trạng thái task
agent-wiki orchestrator view wiki/tasks/queue.md
```

**Agent ghi kết quả vào wiki của chính mình.**

```bash
agent-wiki data-analyst create wiki/reports/q2-analysis.md
agent-wiki data-analyst replace wiki/reports/q2-analysis.md \
  "## Kết quả" "## Kết quả\n\nDoanh thu Q2 tăng 23% so với cùng kỳ."
```

**Agent mới tự khởi tạo tại lần gọi đầu tiên.**

```bash
# Không cần bước setup. Lệnh đầu tiên tự init wiki mới.
agent-wiki new-specialist schema
# [INFO] Wiki mới khởi tạo cho agent: new-specialist
# (hiển thị schema mặc định)
```

### Concurrent Access

Nhiều agent có thể ghi đồng thời. Filesystem service sử dụng **file locking** (`proper-lockfile`) trên từng file khi ghi, ngăn race condition trên các file dùng chung như `index.md` và `log.md`.

---

## 3. Kiến trúc tổng thể

```
agent-wiki <agent-name> <command> [args] [flags]
                │
                ▼
┌───────────────────────────────────────────────────────┐
│              NestJS Commander — Command Router        │
└───┬───────┬──────────┬──────────┬──────────┬──────────┘
    │       │          │          │          │
    ▼       ▼          ▼          ▼          ▼
 Schema   Wiki      Replace    Agents     Sync /
 Cmd      Cmds      Cmd        Cmd        Config Cmds
    │       │          │          │          │
    └───────┴──────────┴──────────┴──────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│                    Core Services                      │
│                                                       │
│  FilesystemService   SchemaService   IndexService     │
│  WikiLoggerService   ReplaceService  AgentService     │
└───────────────────────────────────────────────────────┘
                        │
                        ▼
            ~/.agent-wiki/agents/<agent-name>/
```

---

## 4. Cấu trúc File System

```
~/.agent-wiki/
├── config.json
└── agents/
    ├── orchestrator/
    │   ├── schema.md
    │   ├── index.md
    │   ├── log.md
    │   └── wiki/
    │       ├── tasks/
    │       │   ├── queue.md
    │       │   └── completed.md
    │       └── agents/
    │           └── registry.md
    │
    ├── code-reviewer/
    │   ├── schema.md
    │   ├── index.md
    │   ├── log.md
    │   └── wiki/
    │       ├── rules/
    │       │   └── style-guide.md
    │       └── patterns/
    │           └── design-patterns.md
    │
    └── data-analyst/
        ├── schema.md
        ├── index.md
        ├── log.md
        └── wiki/
            ├── reports/
            └── metrics/
```

### Vai trò từng file

| File | Vai trò | Ai ghi |
|------|---------|--------|
| `schema.md` | Bản đồ điều hướng wiki + quy ước vận hành | Agent / User |
| `index.md` | Mục lục tất cả wiki pages (tự động duy trì) | CLI tự động |
| `log.md` | Lịch sử thao tác, append-only | CLI tự động |
| `wiki/**/*.md` | Nội dung tri thức đã tổng hợp | Agent |

### Cấu trúc schema.md

```markdown
# Schema — <agent-name>

> Khởi tạo: YYYY-MM-DD | Cập nhật: YYYY-MM-DD | Tổng trang: N

## Vai trò Agent

Mô tả ngắn về chuyên môn và phạm vi hoạt động của agent này.

## Cấu trúc Wiki

| Danh mục | Địa chỉ tham chiếu | Số trang | Mô tả |
|----------|-------------------|----------|-------|
| Tasks    | wiki/tasks/       | N        | Hàng đợi và trạng thái công việc |
| Rules    | wiki/rules/       | N        | Quy tắc và heuristics |

## Trang quan trọng

- `wiki/tasks/queue.md` — Hàng đợi task hiện tại
- `wiki/rules/style-guide.md` — Quy tắc chính

## Quy ước

- Mỗi trang bắt đầu bằng YAML frontmatter
- Dùng `[[ref]]` để cross-link giữa các trang
- Cập nhật index.md và log.md sau mỗi thay đổi

## Agents có thể đọc chéo

- `orchestrator` — Agent điều phối, có thể đọc wiki này
```

### Cấu trúc một wiki page

```markdown
---
title: Tên Trang
category: rules
tags: [tag1, tag2]
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# Tên Trang

## Nội dung

...

## Liên kết

- [[wiki/related/page.md]]
```

---

## 5. Schema Layer

Schema (`schema.md`) là file đầu tiên agent đọc khi bắt đầu làm việc. Nó đóng vai trò kép: bản đồ điều hướng toàn bộ wiki và bộ quy ước mà agent phải tuân theo khi ghi nội dung mới.

Schema được hiển thị khi gọi lệnh `schema`. Nếu agent-name chưa tồn tại, wiki được tự động khởi tạo trước khi hiển thị schema mặc định.

Bất kỳ lệnh nào với agent-name chưa tồn tại đều trigger auto-init. Quá trình này tạo `schema.md` với template mặc định, `index.md` rỗng, `log.md` với entry khởi tạo, và các thư mục con mặc định `wiki/concepts/`, `wiki/tasks/`, `wiki/notes/`.

---

## 6. Wiki Layer

### Địa chỉ tham chiếu

Địa chỉ tham chiếu là đường dẫn tương đối từ thư mục gốc của agent:

```
wiki/tasks/queue.md
wiki/rules/style-guide.md
wiki/reports/q2-analysis.md
```

Agent đọc `schema.md` hoặc `index.md` để biết địa chỉ tham chiếu nào đang tồn tại, sau đó dùng địa chỉ đó trong các lệnh `view`, `replace`, `delete`.

### Đọc chéo giữa agents

Bất kỳ agent nào cũng có thể đọc wiki của agent khác bằng cách chỉ định đúng `agent-name`:

```bash
# orchestrator đọc schema của code-reviewer
agent-wiki code-reviewer schema

# orchestrator đọc nội dung một trang cụ thể của code-reviewer
agent-wiki code-reviewer view wiki/rules/style-guide.md
```

Ghi chéo vào wiki của agent khác được phép về mặt kỹ thuật nhưng theo quy ước mỗi agent chỉ ghi vào wiki của mình. Ngoại lệ chấp nhận được là orchestrator cập nhật trạng thái task trong wiki của chính nó để các agent khác đọc.

---

## 7. CLI Commands

### Pattern tổng quát

```
agent-wiki <agent-name> <command> [args...] [flags]
```

`agent-name` luôn đứng ngay sau `agent-wiki`. Mọi lệnh đều bắt đầu bằng pattern này, trừ các lệnh global không thuộc về agent cụ thể (`agents`, `sync --all`, `config`).

### Bảng tổng hợp

| Command | Cú pháp đầy đủ | Mô tả |
|---------|----------------|-------|
| `schema` | `agent-wiki <name> schema` | Hiển thị schema (auto-init nếu chưa tồn tại) |
| `view` | `agent-wiki <name> view <ref>` | Đọc nội dung một wiki page |
| `create` | `agent-wiki <name> create <ref>` | Tạo wiki page mới |
| `delete` | `agent-wiki <name> delete <ref>` | Xóa wiki page |
| `replace` | `agent-wiki <name> replace <target> "<old>" "<new>"` | Thay thế chuỗi trong file |
| `list` | `agent-wiki <name> list [prefix]` | Liệt kê wiki pages |
| `log` | `agent-wiki <name> log` | Xem lịch sử hoạt động |
| `sync` | `agent-wiki <name> sync` | Đồng bộ wiki của agent lên cloud |
| `agents` | `agent-wiki agents` | Liệt kê tất cả agents đang có |
| `sync --all` | `agent-wiki sync --all` | Đồng bộ toàn bộ agents |
| `config` | `agent-wiki config <set\|get> <key> [value]` | Cấu hình global |

### Chi tiết từng command

#### `schema`

```
agent-wiki <agent-name> schema

Hiển thị toàn bộ nội dung schema.md ra stdout.
Nếu agent-name chưa tồn tại, tự động khởi tạo wiki mới
rồi mới hiển thị schema mặc định.

Output: Nội dung schema.md (plain text Markdown)

Ví dụ:
  agent-wiki orchestrator schema
  agent-wiki code-reviewer schema
```

#### `view`

```
agent-wiki <agent-name> view <địa-chỉ-tham-chiếu>

Hiển thị nội dung một wiki page ra stdout.
Có thể dùng để đọc wiki của agent khác (cross-read).
Mặc định ẩn YAML frontmatter, chỉ hiển thị nội dung.

Flags:
  --raw     Hiển thị kèm YAML frontmatter

Output: Nội dung file .md (plain text Markdown)

Ví dụ:
  agent-wiki data-analyst view wiki/reports/q2.md
  agent-wiki orchestrator view wiki/tasks/queue.md
  agent-wiki code-reviewer view wiki/rules/style-guide.md --raw
```

#### `create`

```
agent-wiki <agent-name> create <địa-chỉ-tham-chiếu>

Tạo wiki page mới với YAML frontmatter mặc định.
Tự động tạo thư mục cha nếu chưa tồn tại.
Tự động cập nhật index.md và ghi vào log.md.
Trả về lỗi nếu file đã tồn tại.

Flags:
  --title "Tiêu đề"   Đặt title trong frontmatter
                      (mặc định suy ra từ tên file)

Ví dụ:
  agent-wiki data-analyst create wiki/reports/q3-analysis.md
  agent-wiki code-reviewer create wiki/patterns/singleton.md --title "Singleton Pattern"
```

#### `delete`

```
agent-wiki <agent-name> delete <địa-chỉ-tham-chiếu>

Xóa wiki page.
Tự động cập nhật index.md và ghi vào log.md.
Trả về lỗi nếu file không tồn tại.

Flags:
  --confirm   Bỏ qua prompt xác nhận (dùng khi gọi từ script/agent)

Ví dụ:
  agent-wiki orchestrator delete wiki/tasks/old-task.md --confirm
```

#### `replace`

```
agent-wiki <agent-name> replace <target> "<old-string>" "<new-string>"

Tìm và thay thế chuỗi trong một file.
<target> nhận một trong hai giá trị:
  - "schema"               → chỉnh sửa schema.md
  - <địa-chỉ-tham-chiếu>  → chỉnh sửa wiki page tương ứng

Mặc định chỉ thay thế lần xuất hiện đầu tiên.
Ghi log sau khi thay thế thành công.
Trả về lỗi với exit code 1 nếu old-string không tìm thấy.

Flags:
  --all       Thay thế tất cả lần xuất hiện
  --dry-run   Hiển thị diff mà không ghi file

Ví dụ:
  agent-wiki orchestrator replace wiki/tasks/queue.md \
    "- [ ] Review PR#42" "- [x] Review PR#42"

  agent-wiki code-reviewer replace schema \
    "Tổng trang: 10" "Tổng trang: 11"

  agent-wiki data-analyst replace wiki/metrics/kpi.md \
    "Q1" "Q2" --all --dry-run
```

#### `list`

```
agent-wiki <agent-name> list [prefix]

Liệt kê wiki pages của agent, đọc từ index.md.
Nếu có prefix, chỉ hiển thị pages có địa chỉ bắt đầu bằng prefix.

Output format: <ref> | <title> | <updated>

Flags:
  --json    Output dạng JSON array

Ví dụ:
  agent-wiki orchestrator list
  agent-wiki orchestrator list wiki/tasks/
  agent-wiki data-analyst list wiki/reports/ --json
```

#### `log`

```
agent-wiki <agent-name> log

Xem lịch sử hoạt động từ log.md.

Flags:
  --tail N   Chỉ hiển thị N entry gần nhất (mặc định: 20)
  --json     Output dạng JSON

Ví dụ:
  agent-wiki code-reviewer log
  agent-wiki orchestrator log --tail 5
```

#### `agents`

```
agent-wiki agents

Liệt kê tất cả agent-names đang có trong ~/.agent-wiki/agents/.
Hiển thị tên, ngày khởi tạo và số lượng wiki pages.

Flags:
  --json    Output dạng JSON

Ví dụ:
  agent-wiki agents
  # Output:
  # orchestrator   | init: 2026-05-01 | pages: 12
  # code-reviewer  | init: 2026-05-10 | pages: 8
  # data-analyst   | init: 2026-05-15 | pages: 5
```

---

## 8. Đồng bộ Cloud

Đồng bộ là quyết định của người dùng (human operator), không phải agent. Agent không tự động sync.

### Thiết lập

```bash
agent-wiki config set cloudEndpoint "https://your-cloud.example.com"
agent-wiki config set userToken "your-token"
```

### Sync theo agent hoặc toàn bộ

```bash
agent-wiki <agent-name> sync
agent-wiki sync --all
```

### Flow đồng bộ

```
agent-wiki <agent-name> sync
           │
           ▼
Kiểm tra cloudEndpoint và userToken trong config
           │
    Thiếu config                  Đủ config
           │                          │
           ▼                          ▼
    Báo lỗi, hướng dẫn       Gọi Cloud API
    config set                GET /agents/<name>/status
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
         Chưa tồn tại trên cloud             Đã tồn tại trên cloud
                   │                                     │
                   ▼                                     ▼
         Upload toàn bộ (init)           Tính diff local vs cloud
                                                         │
                                              Có conflict?
                                            ┌────────┴────────┐
                                            ▼                 ▼
                                       Hỏi người dùng    Không conflict
                                       [l]ocal/[c]loud   Upload thẳng
                                       /[s]kip/[a]bort
```

### Cloud API (tham chiếu)

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/agents/:name/status` | `GET` | Kiểm tra agent tồn tại và lấy metadata |
| `/api/agents/:name/files` | `GET` | Lấy danh sách files và checksums |
| `/api/agents/:name/files/:path` | `GET` | Tải nội dung một file |
| `/api/agents/:name/files/:path` | `PUT` | Ghi nội dung một file |
| `/api/agents/:name/init` | `POST` | Khởi tạo agent mới trên cloud |

---

## 9. Module Structure (NestJS)

### Cấu trúc project

```
agent-wiki/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── commands/
│   │   ├── schema.command.ts
│   │   ├── view.command.ts
│   │   ├── create.command.ts
│   │   ├── delete.command.ts
│   │   ├── replace.command.ts
│   │   ├── list.command.ts
│   │   ├── log.command.ts
│   │   ├── agents.command.ts
│   │   ├── sync.command.ts
│   │   └── config.command.ts
│   │
│   ├── modules/
│   │   ├── agent/
│   │   │   ├── agent.module.ts
│   │   │   └── agent.service.ts
│   │   │
│   │   ├── wiki/
│   │   │   ├── wiki.module.ts
│   │   │   ├── wiki.service.ts
│   │   │   ├── schema.service.ts
│   │   │   ├── index.service.ts
│   │   │   └── replace.service.ts
│   │   │
│   │   ├── sync/
│   │   │   ├── sync.module.ts
│   │   │   ├── sync.service.ts
│   │   │   └── cloud-api.service.ts
│   │   │
│   │   └── config/
│   │       ├── config.module.ts
│   │       └── config.service.ts
│   │
│   ├── core/
│   │   ├── filesystem/
│   │   │   ├── filesystem.module.ts
│   │   │   └── filesystem.service.ts
│   │   └── logger/
│   │       └── wiki-logger.service.ts
│   │
│   └── utils/
│       ├── path.util.ts
│       ├── frontmatter.util.ts
│       └── diff.util.ts
│
├── package.json
├── tsconfig.json
└── nest-cli.json
```

### Dependencies

```json
{
  "dependencies": {
    "@nestjs/core": "^10.x",
    "@nestjs/common": "^10.x",
    "@nestjs/axios": "^3.x",
    "nestjs-commander": "^3.x",
    "axios": "^1.x",
    "chalk": "^5.x",
    "gray-matter": "^4.x",
    "fs-extra": "^11.x",
    "proper-lockfile": "^4.x",
    "diff": "^5.x",
    "inquirer": "^9.x"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.x",
    "@types/node": "^20.x",
    "typescript": "^5.x"
  }
}
```

---

## 10. Chi tiết từng Module

### 10.1 AgentService

Chịu trách nhiệm auto-init và discovery. Mọi command handler đều gọi `ensureAgent()` đầu tiên để đảm bảo wiki tồn tại trước khi thực thi.

```typescript
@Injectable()
export class AgentService {
  constructor(
    private readonly fs: FilesystemService,
    private readonly schema: SchemaService,
    private readonly logger: WikiLoggerService,
  ) {}

  async ensureAgent(agentName: string): Promise<{ isNew: boolean }> {
    const exists = await this.fs.exists(this.fs.getAgentPath(agentName));
    if (!exists) {
      await this.initializeAgent(agentName);
      return { isNew: true };
    }
    return { isNew: false };
  }

  private async initializeAgent(agentName: string): Promise<void> {
    await this.fs.createAgentDirectory(agentName);
    await this.schema.createDefaultSchema(agentName);
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

  async listAgents(): Promise<AgentInfo[]> {
    const names = await this.fs.listAgentNames();
    return Promise.all(names.map(name => this.getAgentInfo(name)));
  }

  private async getAgentInfo(agentName: string): Promise<AgentInfo> {
    const index = await this.fs.readFile(this.fs.getIndexPath(agentName));
    const pageCount = (index.match(/^- /gm) ?? []).length;
    const log = await this.fs.readFile(this.fs.getLogPath(agentName));
    const initDate = log.match(/\[(\d{4}-\d{2}-\d{2})/)?.[1] ?? 'unknown';
    return { name: agentName, initDate, pageCount };
  }
}
```

### 10.2 WikiService

CRUD operations cho wiki pages.

```typescript
@Injectable()
export class WikiService {
  constructor(
    private readonly fs: FilesystemService,
    private readonly index: IndexService,
    private readonly logger: WikiLoggerService,
  ) {}

  async viewPage(agentName: string, ref: string, raw = false): Promise<string> {
    const filePath = this.fs.resolveWikiRef(agentName, ref);
    if (!(await this.fs.exists(filePath))) {
      throw new NotFoundException(`Trang wiki không tồn tại: ${ref}`);
    }
    const content = await this.fs.readFile(filePath);
    return raw ? content : content.replace(/^---[\s\S]*?---\n/, '');
  }

  async createPage(agentName: string, ref: string, title?: string): Promise<void> {
    const filePath = this.fs.resolveWikiRef(agentName, ref);
    if (await this.fs.exists(filePath)) {
      throw new ConflictException(`Trang wiki đã tồn tại: ${ref}`);
    }
    await this.fs.ensureDir(path.dirname(filePath));
    await this.fs.writeFile(filePath, this.generateTemplate(ref, title));
    await this.index.addEntry(agentName, ref, title ?? this.inferTitle(ref));
    await this.logger.log(agentName, 'create', `Tạo trang: ${ref}`);
  }

  async deletePage(agentName: string, ref: string, confirm = false): Promise<void> {
    const filePath = this.fs.resolveWikiRef(agentName, ref);
    if (!(await this.fs.exists(filePath))) {
      throw new NotFoundException(`Trang wiki không tồn tại: ${ref}`);
    }
    if (!confirm) {
      const { ok } = await inquirer.prompt([{
        type: 'confirm',
        name: 'ok',
        message: `Xác nhận xóa ${ref}?`,
        default: false,
      }]);
      if (!ok) return;
    }
    await this.fs.deleteFile(filePath);
    await this.index.removeEntry(agentName, ref);
    await this.logger.log(agentName, 'delete', `Xóa trang: ${ref}`);
  }

  async listPages(agentName: string, prefix?: string): Promise<WikiPageEntry[]> {
    const all = await this.index.getAll(agentName);
    return prefix ? all.filter(e => e.ref.startsWith(prefix)) : all;
  }

  private generateTemplate(ref: string, title?: string): string {
    const t = title ?? this.inferTitle(ref);
    const now = new Date().toISOString().split('T')[0];
    return [
      '---',
      `title: ${t}`,
      `category: ${this.inferCategory(ref)}`,
      'tags: []',
      `created: ${now}`,
      `updated: ${now}`,
      '---',
      '',
      `# ${t}`,
      '',
    ].join('\n');
  }

  private inferTitle(ref: string): string {
    return path.basename(ref, '.md').replace(/-/g, ' ');
  }

  private inferCategory(ref: string): string {
    return ref.split('/')[1] ?? 'general';
  }
}
```

### 10.3 ReplaceService

```typescript
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
    const filePath = target === 'schema'
      ? this.fs.getSchemaPath(agentName)
      : this.fs.resolveWikiRef(agentName, target);

    if (!(await this.fs.exists(filePath))) {
      throw new NotFoundException(`File không tồn tại: ${target}`);
    }

    const content = await this.fs.readFile(filePath);

    if (!content.includes(oldStr)) {
      return { success: false, count: 0, message: 'Không tìm thấy chuỗi cần thay thế.' };
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
```

### 10.4 FilesystemService

```typescript
@Injectable()
export class FilesystemService {
  private readonly baseDir = path.join(os.homedir(), '.agent-wiki');

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

  resolveWikiRef(name: string, ref: string): string {
    // Ngăn path traversal
    const safe = path.normalize(ref).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.getAgentPath(name), safe);
  }

  async withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
    const release = await lockfile.lock(filePath, {
      retries: { retries: 5, minTimeout: 50 },
    });
    try {
      return await fn();
    } finally {
      await release();
    }
  }

  async listAgentNames(): Promise<string[]> {
    const agentsDir = path.join(this.baseDir, 'agents');
    await fs.ensureDir(agentsDir);
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  }

  async exists(p: string): Promise<boolean> { return fs.pathExists(p); }
  async readFile(p: string): Promise<string> { return fs.readFile(p, 'utf-8'); }
  async writeFile(p: string, content: string): Promise<void> { return fs.outputFile(p, content); }
  async appendFile(p: string, content: string): Promise<void> { return fs.appendFile(p, content); }
  async deleteFile(p: string): Promise<void> { return fs.remove(p); }
  async ensureDir(p: string): Promise<void> { return fs.ensureDir(p); }
  async createAgentDirectory(name: string): Promise<void> {
    await fs.ensureDir(this.getAgentPath(name));
  }
}
```

### 10.5 WikiLoggerService

```typescript
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
```

### 10.6 Command handler mẫu — SchemaCommand

```typescript
@SubCommand({
  name: 'schema',
  description: 'Hiển thị schema của agent. Auto-init nếu chưa tồn tại.',
})
export class SchemaCommand extends CommandRunner {
  constructor(
    private readonly agentService: AgentService,
    private readonly schemaService: SchemaService,
  ) {
    super();
  }

  async run(_args: string[], opts: { agentName: string }): Promise<void> {
    const { isNew } = await this.agentService.ensureAgent(opts.agentName);
    if (isNew) {
      console.log(chalk.green(`[INFO] Wiki mới khởi tạo cho agent: ${opts.agentName}\n`));
    }
    const schema = await this.schemaService.getSchema(opts.agentName);
    console.log(schema);
  }
}
```

### 10.7 Root Command

```typescript
@Command({
  name: 'agent-wiki',
  arguments: '<agent-name>',
  subCommands: [
    SchemaCommand,
    ViewCommand,
    CreateCommand,
    DeleteCommand,
    ReplaceCommand,
    ListCommand,
    LogCommand,
    SyncCommand,
  ],
  description: 'Agent Wiki CLI — knowledge base cho AI agents',
})
export class AgentWikiCommand extends CommandRunner {
  async run([agentName]: string[]): Promise<void> {
    console.log(`Agent: ${agentName}. Dùng --help để xem các lệnh có sẵn.`);
  }
}

// Lệnh global (không thuộc agent cụ thể) đăng ký riêng ở root:
// agent-wiki agents
// agent-wiki sync --all
// agent-wiki config ...
```

---

## 11. Error Handling & Validation

### Validation

| Trường | Rule |
|--------|------|
| `agent-name` | Chỉ `[a-z0-9\-_]`, tối đa 64 ký tự |
| Địa chỉ tham chiếu | Phải kết thúc `.md`, không chứa `..`, phải bắt đầu bằng `wiki/` hoặc là `schema` |
| `old-string` | Không được rỗng, tối đa 10.000 ký tự |
| `new-string` | Tối đa 100.000 ký tự |

### Bảng lỗi

| Lỗi | Nguyên nhân | Hành vi |
|-----|------------|---------|
| `WikiPageNotFoundError` | Địa chỉ tham chiếu không tồn tại | Báo lỗi, gợi ý kiểm tra `list` hoặc `schema` |
| `WikiPageAlreadyExistsError` | `create` khi file đã tồn tại | Báo lỗi, gợi ý dùng `replace` |
| `StringNotFoundError` | `replace` khi `old-string` không có trong file | Báo lỗi |
| `PathTraversalError` | Địa chỉ tham chiếu chứa `..` | Từ chối thực hiện |
| `CloudSyncUnauthorizedError` | Thiếu `userToken` trong config | Yêu cầu `config set userToken` |
| `FileLockTimeoutError` | Không lấy được file lock sau 5 lần retry | Báo lỗi, gợi ý thử lại |

### Exit Codes

| Code | Ý nghĩa |
|------|---------|
| `0` | Thành công |
| `1` | Lỗi logic (file không tồn tại, chuỗi không tìm thấy) |
| `2` | Lỗi validation (agent-name không hợp lệ, path traversal) |
| `3` | Lỗi hệ thống (không đọc/ghi được file) |
| `4` | Lỗi network (sync thất bại) |

Exit code rõ ràng là yêu cầu bắt buộc vì agent gọi CLI qua subprocess và cần bắt lỗi theo code, không phải parse text output.

---

## 12. Configuration

### config.json

```json
{
  "cloudEndpoint": null,
  "userToken": null,
  "autoUpdateIndex": true,
  "logRetentionDays": 90,
  "defaultWikiDirs": ["concepts", "tasks", "notes"]
}
```

### Config commands

```bash
# Thiết lập cloud endpoint
agent-wiki config set cloudEndpoint "https://your-cloud.example.com"

# Thiết lập user token cho sync
agent-wiki config set userToken "your-token"

# Xem một giá trị cụ thể
agent-wiki config get cloudEndpoint

# Xem toàn bộ config
agent-wiki config list
```
