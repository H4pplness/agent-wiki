import { Injectable } from '@nestjs/common';
import { parseFrontmatter, stripFrontmatter } from '../../utils/frontmatter.util';

@Injectable()
export class MarkdownService {
  parse(content: string) {
    return parseFrontmatter(content);
  }

  stripFrontmatter(content: string): string {
    return stripFrontmatter(content);
  }

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

  inferCategory(ref: string): string {
    const parts = ref.split('/');
    return parts[1] ?? 'general';
  }
}
