import { Injectable } from '@nestjs/common';
import { FilesystemService } from '../../core/filesystem/filesystem.service';
import { generateFrontmatter } from '../../utils/frontmatter.util';

const DEFAULT_SCHEMA_TEMPLATE = `---
title: Schema
category: system
tags: [schema]
created: {{created}}
updated: {{updated}}
---

# Schema — {{agentName}}

> Khởi tạo: {{created}} | Cập nhật: {{updated}} | Tổng trang: 0

## Vai trò Agent

Mô tả ngắn về chuyên môn và phạm vi hoạt động của agent này.

## Cấu trúc Wiki

| Danh mục | Địa chỉ tham chiếu | Số trang | Mô tả |
|----------|-------------------|----------|-------|
| Concepts | wiki/concepts/    | 0        | Khái niệm và định nghĩa |
| Tasks    | wiki/tasks/       | 0        | Hàng đợi và trạng thái công việc |
| Notes    | wiki/notes/       | 0        | Ghi chú và tài liệu tham khảo |

## Trang quan trọng

_Chưa có trang nào._

## Quy ước

- Mỗi trang bắt đầu bằng YAML frontmatter
- Dùng \`[[ref]]\` để cross-link giữa các trang
- Cập nhật index.md và log.md sau mỗi thay đổi

## Agents có thể đọc chéo

_Chưa có agent nào được cấp quyền đọc chéo._
`;

@Injectable()
export class SchemaService {
  constructor(private readonly fs: FilesystemService) {}

  async getSchema(agentName: string): Promise<string> {
    const schemaPath = this.fs.getSchemaPath(agentName);
    return this.fs.readFile(schemaPath);
  }

  async createDefaultSchema(agentName: string): Promise<void> {
    const now = new Date().toISOString().split('T')[0];
    const content = DEFAULT_SCHEMA_TEMPLATE
      .replace(/\{\{created\}\}/g, now)
      .replace(/\{\{updated\}\}/g, now)
      .replace(/\{\{agentName\}\}/g, agentName);
    await this.fs.writeFile(this.fs.getSchemaPath(agentName), content);
  }

  async updateSchema(agentName: string, content: string): Promise<void> {
    const schemaPath = this.fs.getSchemaPath(agentName);
    await this.fs.withLock(schemaPath, async () => {
      await this.fs.writeFile(schemaPath, content);
    });
  }

  generateTemplate(agentName: string): string {
    const now = new Date().toISOString().split('T')[0];
    return DEFAULT_SCHEMA_TEMPLATE
      .replace(/\{\{created\}\}/g, now)
      .replace(/\{\{updated\}\}/g, now)
      .replace(/\{\{agentName\}\}/g, agentName);
  }
}
