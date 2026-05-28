---
name: agent-wiki
description: >
  Hướng dẫn sử dụng agent-wiki CLI và xây dựng wiki đúng chuẩn. Dùng skill này
  bất cứ khi nào agent cần: khởi động và đọc schema, đọc/tạo/sửa/xóa wiki page,
  cập nhật index.md, đặt tên file, phân vân tạo mới hay chỉnh sửa trang cũ, hoặc
  đọc wiki của agent khác để phối hợp. Đây là tài liệu vận hành chính của toàn bộ
  hệ thống agent-wiki — đọc trước khi thực hiện bất kỳ thao tác nào với wiki.
---

# Agent Wiki — CLI Guide & Wiki Building Standards

---

## Bắt đầu — luôn làm điều này trước

```bash
# 1. Khởi tạo wiki (nếu chưa có) và xem layout hiện tại
agent-wiki <your-name> schema

# 2. Xem danh sách pages đang có
agent-wiki <your-name> list
```

Đặt tên agent theo vai trò, tối đa 64 ký tự, chỉ dùng `[a-z0-9\-_]`:
`code-reviewer`, `orchestrator`, `data-analyst`, `debugger`, v.v.

---

## CLI Commands

### Đọc

```bash
# Xem schema (bản đồ điều hướng toàn bộ wiki)
agent-wiki <name> schema

# Xem nội dung một page
agent-wiki <name> view wiki/concepts/circuit-breaker.md

# Liệt kê toàn bộ pages
agent-wiki <name> list

# Liệt kê pages theo prefix
agent-wiki <name> list wiki/tasks/

# Output dạng JSON (tiện cho script)
agent-wiki <name> list wiki/reports/ --json
```

### Ghi

```bash
# Tạo page mới — LỖI nếu page đã tồn tại
agent-wiki <name> create wiki/concepts/circuit-breaker.md --title "Circuit Breaker Pattern"

# Chỉnh sửa nội dung (exact string match)
agent-wiki <name> replace wiki/tasks/queue.md \
  "- [ ] Review auth module" "- [x] Review auth module"

# Thay tất cả lần xuất hiện
agent-wiki <name> replace wiki/metrics/kpi.md "Q1" "Q2" --all

# Xem trước diff, không ghi file
agent-wiki <name> replace wiki/rules/policy.md "cũ" "mới" --dry-run

# Chỉnh sửa schema
agent-wiki <name> replace schema "Tổng trang: 10" "Tổng trang: 11"
```

### Xóa

```bash
# Xóa page (có prompt xác nhận)
agent-wiki <name> delete wiki/notes/obsolete.md

# Bỏ qua prompt — dùng khi gọi từ script
agent-wiki <name> delete wiki/notes/obsolete.md --confirm
```

### Lịch sử & Global

```bash
# Xem lịch sử hoạt động
agent-wiki <name> log

# Xem N dòng cuối
agent-wiki <name> log --tail 20

# Liệt kê tất cả agents đang có trên máy
agent-wiki agents

# Đồng bộ lên cloud
agent-wiki <name> sync

# Đồng bộ tất cả agents
agent-wiki sync-all
```

### Cấu hình

```bash
# Xem toàn bộ cấu hình
agent-wiki config list

# Xem một giá trị
agent-wiki config get cloudEndpoint

# Thiết lập cấu hình
agent-wiki config set cloudEndpoint https://api.example.com
agent-wiki config set userToken your-token-here
agent-wiki config set autoUpdateIndex true
agent-wiki config set logRetentionDays 90
```

Các key có sẵn:

| Key | Mặc định | Mô tả |
|-----|----------|-------|
| `cloudEndpoint` | `null` | URL cloud server để đồng bộ |
| `userToken` | `null` | Token xác thực cho cloud |
| `autoUpdateIndex` | `true` | Tự động cập nhật index.md |
| `logRetentionDays` | `90` | Số ngày giữ log |
| `defaultWikiDirs` | `["concepts","tasks","notes"]` | Thư mục mặc định khi init |

### Đọc wiki của agent khác (cross-read)

```bash
# Đọc schema của agent khác
agent-wiki orchestrator schema

# Đọc một page cụ thể của agent khác
agent-wiki data-analyst view wiki/reports/q2-findings.md
```

---

## Quy tắc quan trọng khi dùng CLI

| Quy tắc | Lý do |
|---------|-------|
| **Đọc trước khi ghi** — `list` hoặc `view` trước | Tránh tạo trùng hoặc ghi đè nhầm |
| **`old-string` trong `replace` phải chính xác từng ký tự** | Sai một dấu cách hay xuống dòng → exit code 1 |
| **`create` cho page mới, `replace` cho page cũ** | `create` báo lỗi nếu file đã tồn tại |
| **Chỉ ghi vào wiki của mình** | Cross-read thoải mái; cross-write không được trừ khi có lý do rõ ràng |
| **Cập nhật schema sau khi thêm pages** | Schema là bản đồ điều hướng — để sai thì agent sau bị lạc |

---

## Naming Conventions

### Quy tắc đặt tên file

```
Format:    kebab-case, chữ thường, không dấu, tiếng Anh
Độ dài:    2–5 từ, tối đa 50 ký tự (không tính .md)
Extension: luôn là .md
```

Không hợp lệ — tuyệt đối không dùng:
- Tên 1 từ chung chung: `auth.md`, `data.md`, `service.md`
- Từ khoá quá rộng đứng một mình: `overview.md`, `guide.md`, `notes.md`

**Suffix chuẩn theo loại trang:**

| Suffix | Loại trang | Trả lời câu hỏi | Ví dụ |
|--------|-----------|-----------------|-------|
| *(không có)* | Concept thuần | "X là gì?" | `attention-mechanism.md` |
| `-overview` | Entry point tổng quan | "X bao gồm những gì?" | `authentication-overview.md` |
| `-guide` | How-to có steps | "Làm X như thế nào?" | `jwt-nestjs-guide.md` |
| `-patterns` | Tập hợp patterns | "Các cách phổ biến để làm X?" | `error-handling-patterns.md` |
| `-comparison` | So sánh 2+ thứ | "X vs Y khác nhau?" | `rag-vs-finetuning-comparison.md` |
| `-reference` | Tra cứu nhanh | "X có những options nào?" | `http-status-codes-reference.md` |
| `-cookbook` | Tập recipes | "Ví dụ thực tế về X?" | `nestjs-guards-cookbook.md` |

Quy tắc chống nhập nhằng:
- Cùng topic vừa là concept vừa là guide → **bắt buộc** dùng suffix
- Hai trang tên gần giống → một trong hai phải thêm suffix rõ hơn hoặc merge
- Khi phân vân: hỏi "trang này trả lời câu hỏi gì?" rồi chọn suffix tương ứng

### Folder taxonomy

Danh mục được tạo động — không có cấu trúc cố định. Khi `create` một trang trong `wiki/<danh-mục>/`, thư mục sẽ tự động xuất hiện.

Tối đa 1 cấp lồng nhau. Không tạo thư mục con của thư mục con.

**Danh mục khuyến nghị:**

| Danh mục | Dùng khi | Ví dụ |
|----------|---------|-------|
| `concepts/` | Định nghĩa, lý thuyết ("X là gì?") | `wiki/concepts/circuit-breaker.md` |
| `guides/` | Hướng dẫn có steps ("Làm X như thế nào?") | `wiki/guides/jwt-nestjs-guide.md` |
| `entities/` | Thư viện, framework, công cụ cụ thể | `wiki/entities/prisma.md` |
| `comparisons/` | So sánh ("X vs Y") | `wiki/comparisons/rag-vs-finetuning.md` |
| `patterns/` | Pattern tái xuất hiện trong domain | `wiki/patterns/error-handling-patterns.md` |
| `tasks/` | Công việc đang theo dõi | `wiki/tasks/migrate-auth.md` |
| `notes/` | Ghi chú tạm thời, chưa categorize | `wiki/notes/meeting-2024-01-15.md` |

Câu hỏi chọn thư mục — dừng ở câu đầu tiên trả lời "có":

```
Đây là định nghĩa/lý thuyết?        → concepts/
Đây là hướng dẫn có thể làm theo?   → guides/
Đây là một thứ cụ thể có tên riêng? → entities/
Đây là "A vs B"?                    → comparisons/
Đây là pattern tái xuất hiện?       → patterns/
Đây là công việc cần track?         → tasks/
Chưa rõ?                            → notes/
```

---

## Disambiguation block

Thêm block này ở đầu trang khi trang dễ nhầm với trang khác:

```markdown
> 📍 **Trang này về:** [mô tả ngắn gọn]
> 🔀 **Bạn có thể đang tìm:**
> - [Mô tả trang khác] → [[wiki/path/other-page.md]]
```

Bắt buộc khi:
- Tên file gần giống trang khác (`caching.md` và `redis-cache.md`)
- Cùng topic nhưng khác loại (concept vs guide cùng chủ đề)
- Có quan hệ parent-child với trang khác

---

## Quy tắc index.md

Dùng grouped layout — nhóm theo thư mục, full path trong link:

```markdown
### concepts/
| Trang | Trả lời câu hỏi |
|-------|-----------------|
| [[wiki/concepts/jwt-overview.md]] | JWT là gì, tại sao dùng |
| [[wiki/concepts/solid-principles.md]] | SOLID là gì, ví dụ từng nguyên tắc |

### guides/
| Trang | Trả lời câu hỏi |
|-------|-----------------|
| [[wiki/guides/jwt-nestjs-guide.md]] | Cài đặt JWT trong NestJS step-by-step |
| [[wiki/guides/nestjs-guard-guide.md]] | Cách viết Guard trong NestJS |
```

- Group header thay thế cột `type` — dễ scan theo chủ đề
- Full path → dùng thẳng trong lệnh `view` không cần reconstruct
- Cột "Trả lời câu hỏi" bắt buộc — chọn đúng trang mà không cần mở file

---

## Tạo mới vs chỉnh sửa trang cũ

**Chỉnh sửa trang cũ khi:**
- Thông tin cũ lỗi thời hoặc sai
- Bổ sung chi tiết vào concept đã có
- Hai nguồn mô tả cùng một khái niệm → merge
- Nội dung mới overlap >70% với trang cũ

**Tạo trang mới khi:**
- Góc độ rõ ràng khác nhau (concept vs guide cùng chủ đề)
- Scope không overlap nhiều với trang nào đang có
- Thực thể độc lập, chỉ liên quan chứ không phải cùng một thứ

**Checklist trước khi tạo trang mới:**
```
□ Đã đọc index.md, không có trang nào cover >70% topic này?
□ Tên file: kebab-case, 2-5 từ, suffix phù hợp?
□ Thư mục: đúng folder taxonomy?
□ Đã thêm entry vào index.md TRƯỚC khi tạo file?
□ Có disambiguation block nếu tên gần giống trang khác?
□ Đã cross-link từ ít nhất 1 trang liên quan?
```

---

## Exit codes

| Code | Ý nghĩa |
|------|---------|
| `0` | Thành công |
| `1` | Lỗi logic (file không tồn tại, old-string không tìm thấy) |
| `2` | Lỗi validation (agent-name không hợp lệ, path traversal) |
| `3` | Lỗi hệ thống (không đọc/ghi được file) |
| `4` | Lỗi network (sync thất bại) |

Agent gọi CLI qua subprocess nên cần bắt lỗi theo exit code, không parse text.