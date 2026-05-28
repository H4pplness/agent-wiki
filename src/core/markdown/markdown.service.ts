import { Injectable } from '@nestjs/common';

const FOLDER_TO_TYPE: Record<string, string> = {
  concepts: 'concept',
  guides: 'guide',
  entities: 'entity',
  comparisons: 'comparison',
  patterns: 'pattern',
  tasks: 'task',
  notes: 'note',
};

@Injectable()
export class MarkdownService {
  extractLinks(content: string): string[] {
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const links: string[] = [];
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }
    return links;
  }

  inferTitle(ref: string): string {
    const basename = ref.split('/').pop() ?? ref;
    return basename.replace(/\.md$/, '').replace(/-/g, ' ');
  }

  inferType(ref: string): string {
    const parts = ref.split('/');
    const folder = parts[1] ?? 'notes';
    return FOLDER_TO_TYPE[folder] ?? 'note';
  }

  inferCategory(ref: string): string {
    return this.inferType(ref);
  }
}
