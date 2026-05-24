import * as diff from 'diff';

export function computeDiff(oldContent: string, newContent: string): string {
  const changes = diff.diffLines(oldContent, newContent);
  let output = '';

  for (const change of changes) {
    const prefix = change.added ? '+' : change.removed ? '-' : ' ';
    const lines = change.value.split('\n').filter((l: string) => l !== '');
    for (const line of lines) {
      output += `${prefix} ${line}\n`;
    }
  }

  return output;
}
