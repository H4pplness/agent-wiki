const fs = require('fs');
const path = require('path');

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function replaceInFile(filePath, oldStr, newStr) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(oldStr)) return false;
  const updated = content.replace(oldStr, newStr);
  fs.writeFileSync(filePath, updated, 'utf8');
  return true;
}

function patchFile(filePath, patch) {
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = applyPatch(content, patch);
  fs.writeFileSync(filePath, updated, 'utf8');
}

function applyPatch(content, patch) {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const endsWithEol = content.endsWith('\n');
  const lines = splitLines(content);
  const hunks = parsePatch(stripBom(patch));

  for (const hunk of hunks) {
    const oldLines = hunk
      .filter((line) => line.type === 'context' || line.type === 'remove')
      .map((line) => line.content);
    const newLines = hunk
      .filter((line) => line.type === 'context' || line.type === 'add')
      .map((line) => line.content);

    const index = findSequence(lines, oldLines);
    if (index === -1) {
      throw new Error('Patch context not found in file.');
    }
    lines.splice(index, oldLines.length, ...newLines);
  }

  return lines.join(eol) + (endsWithEol ? eol : '');
}

function parsePatch(patch) {
  const lines = splitLines(patch);
  const hunks = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('--- ') || line.startsWith('+++ ')) {
      continue;
    }
    if (line.startsWith('@@')) {
      current = [];
      hunks.push(current);
      continue;
    }
    if (!current) {
      if (line.trim() === '') continue;
      throw new Error('Patch must start with a hunk header: @@');
    }
    if (line.startsWith(' ')) {
      current.push({ type: 'context', content: line.slice(1) });
    } else if (line.startsWith('-')) {
      current.push({ type: 'remove', content: line.slice(1) });
    } else if (line.startsWith('+')) {
      current.push({ type: 'add', content: line.slice(1) });
    } else if (line === '\\ No newline at end of file') {
      continue;
    } else {
      throw new Error(`Invalid patch line: ${line}`);
    }
  }

  if (hunks.length === 0) {
    throw new Error('Patch must contain at least one hunk.');
  }
  return hunks;
}

function findSequence(lines, sequence) {
  if (sequence.length === 0) return -1;
  for (let i = 0; i <= lines.length - sequence.length; i += 1) {
    let matched = true;
    for (let j = 0; j < sequence.length; j += 1) {
      if (lines[i + j] !== sequence[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return i;
  }
  return -1;
}

function splitLines(content) {
  const lines = content.split(/\r?\n/);
  if (content.endsWith('\n')) lines.pop();
  return lines;
}

function stripBom(content) {
  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
}

function removeDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

module.exports = { writeFile, replaceInFile, patchFile, removeDir };
