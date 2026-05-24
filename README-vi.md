# Agent Wiki

Nền tảng tri thức CLI dành cho AI agent — shared file system có thể truy cập qua CLI binary.

## Bài toán

Khi nhiều AI agent phối hợp trong một hệ thống, mỗi agent cần ngữ cảnh chuyên môn riêng để hoạt động hiệu quả. Tuy nhiên, các agent thường chạy trong môi trường tách biệt — process khác nhau, MCP server khác nhau, container khác nhau — và không có cơ chế chia sẻ context tự nhiên. Agent Wiki giải quyết bài toán này bằng cách cung cấp một shared file system mà tất cả agent đều có thể truy cập thông qua cùng một CLI binary, không cần microservice hay network call nội bộ.

## Nguyên tắc thiết kế

- **Stateless hoàn toàn.** Mỗi lệnh CLI là một transaction độc lập, tự mang đủ context qua `agent-name`. Không có session, không có trạng thái giữa các lần gọi.
- **Agent-name là định danh duy nhất.** Không cần đăng nhập hay xác thực. Tên agent xác định kho tri thức nào được truy cập. Nếu tên chưa tồn tại, wiki được khởi tạo tự động tại lần gọi đầu tiên.
- **Tri thức đã được tổng hợp.** Không có lớp raw sources. Agent chịu trách nhiệm tổng hợp và đưa kiến thức đã xử lý vào wiki dưới dạng Markdown.
- **Local-first.** Toàn bộ dữ liệu lưu trên máy local. Đồng bộ cloud là tính năng tùy chọn do người dùng quyết định.
- **Đọc chéo tự do.** Agent A có thể đọc wiki của agent B bằng cách chỉ định đúng `agent-name`. Phối hợp diễn ra qua shared file system.

## Cài đặt

```bash
git clone <repo-url>
cd agent-wiki
npm install
npm run build
npm link
```

## Cách dùng

```
agent-wiki <agent-name> <command> [args...] [flags]
agent-wiki agents
agent-wiki sync-all
agent-wiki config <set|get|list> <key> [value]
```

### Lệnh cho Agent

| Lệnh | Mô tả |
|------|-------|
| `schema <agent-name>` | Hiển thị schema. Tự động khởi tạo wiki nếu chưa tồn tại. |
| `view <agent-name> <ref>` | Đọc nội dung một wiki page. Mặc định ẩn frontmatter. |
| `create <agent-name> <ref>` | Tạo wiki page mới với frontmatter mặc định. |
| `delete <agent-name> <ref>` | Xóa wiki page. Có prompt xác nhận. |
| `replace <agent-name> <target> <old> <new>` | Tìm và thay thế chuỗi trong file. |
| `list <agent-name> [prefix]` | Liệt kê wiki pages. |
| `log <agent-name>` | Xem lịch sử hoạt động. |
| `sync <agent-name>` | Đồng bộ wiki của agent lên cloud. |

### Lệnh Toàn cục

| Lệnh | Mô tả |
|------|-------|
| `agents` | Liệt kê tất cả agents kèm ngày khởi tạo và số trang. |
| `sync-all` | Đồng bộ toàn bộ agents. |
| `config set <key> <value>` | Thiết lập một giá trị cấu hình. |
| `config get <key>` | Xem một giá trị cấu hình. |
| `config list` | Xem toàn bộ cấu hình. |

### Flags

| Flag | Áp dụng cho | Mô tả |
|------|------------|-------|
| `--json` | `list`, `log`, `agents` | Output dạng JSON |
| `--raw` | `view` | Hiển thị kèm YAML frontmatter |
| `--title <title>` | `create` | Đặt tiêu đề cho trang |
| `--confirm` | `delete` | Bỏ qua prompt xác nhận |
| `--all` | `replace` | Thay thế tất cả lần xuất hiện |
| `--dry-run` | `replace` | Hiển thị diff không ghi file |
| `--tail <n>` | `log` | Số entry log gần nhất (mặc định: 20) |

### Ví dụ

```bash
# Tự động khởi tạo wiki mới và hiển thị schema
agent-wiki schema code-reviewer

# Tạo wiki page mới
agent-wiki create code-reviewer wiki/rules/style-guide.md --title "Style Guide"

# Đọc trang wiki của agent khác (đọc chéo)
agent-wiki orchestrator view code-reviewer wiki/rules/style-guide.md

# Tìm và thay thế
agent-wiki orchestrator replace wiki/tasks/queue.md \
  "- [ ] Review PR#42" "- [x] Review PR#42"

# Thay thế tất cả với dry run
agent-wiki data-analyst replace wiki/metrics/kpi.md "Q1" "Q2" --all --dry-run

# Liệt kê trang theo prefix
agent-wiki orchestrator list wiki/tasks/ --json

# Xem hoạt động gần đây
agent-wiki orchestrator log --tail 10

# Liệt kê tất cả agents
agent-wiki agents

# Cấu hình đồng bộ cloud
agent-wiki config set cloudEndpoint "https://cloud.example.com"
agent-wiki config set userToken "your-token"
agent-wiki sync orchestrator
```

## Cấu trúc File System

```
~/.agent-wiki/
├── config.json
└── agents/
    └── <agent-name>/
        ├── schema.md       # Bản đồ điều hướng + quy ước vận hành
        ├── index.md        # Mục lục tự động duy trì
        ├── log.md          # Lịch sử thao tác, append-only
        └── wiki/           # Nội dung tri thức đã tổng hợp
            ├── concepts/
            ├── tasks/
            └── notes/
```

## Exit Codes

| Code | Ý nghĩa |
|------|---------|
| `0` | Thành công |
| `1` | Lỗi logic (file không tồn tại, chuỗi không tìm thấy) |
| `2` | Lỗi validation (agent-name không hợp lệ, path traversal) |
| `3` | Lỗi hệ thống (không đọc/ghi được file) |
| `4` | Lỗi network (sync thất bại) |

## Công nghệ

- **Runtime:** Node.js
- **Framework:** NestJS (standalone application context)
- **CLI:** Commander.js
- **Ngôn ngữ:** TypeScript
- **Thư viện:** chalk, gray-matter, fs-extra, proper-lockfile, diff, inquirer

## Giấy phép

MIT
