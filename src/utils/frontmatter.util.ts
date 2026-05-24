import matter from 'gray-matter';

export interface FrontmatterData {
  title: string;
  category: string;
  tags: string[];
  created: string;
  updated: string;
  [key: string]: unknown;
}

export function parseFrontmatter(content: string): {
  data: FrontmatterData;
  content: string;
} {
  const parsed = matter(content);
  return {
    data: parsed.data as FrontmatterData,
    content: parsed.content,
  };
}

export function generateFrontmatter(
  title: string,
  category: string,
  tags: string[] = [],
): string {
  const now = new Date().toISOString().split('T')[0];
  const lines = [
    '---',
    `title: ${title}`,
    `category: ${category}`,
    `tags: [${tags.join(', ')}]`,
    `created: ${now}`,
    `updated: ${now}`,
    '---',
    '',
    `# ${title}`,
    '',
  ];
  return lines.join('\n');
}

export function stripFrontmatter(content: string): string {
  return content.replace(/^---[\s\S]*?---\n/, '');
}

export function updateFrontmatterDate(content: string): string {
  const now = new Date().toISOString().split('T')[0];
  return content.replace(
    /^(updated:\s*).*$/m,
    `$1${now}`,
  );
}
