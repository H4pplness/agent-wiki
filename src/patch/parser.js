/**
 * parser.js — Parse RFC-01 patch format into an AST of file operations.
 *
 * Grammar:
 *   Patch      := "*** Begin Patch" NEWLINE { FileOp } "*** End Patch" NEWLINE
 *   FileOp     := AddFile | UpdateFile | DeleteFile
 *   AddFile    := "*** Add File: " path NEWLINE { "+" line NEWLINE }
 *   DeleteFile := "*** Delete File: " path NEWLINE
 *   UpdateFile := "*** Update File: " path NEWLINE { Hunk }
 *   Hunk       := "@@" [ header ] NEWLINE { HunkLine }
 *   HunkLine   := (" " | "-" | "+") text NEWLINE
 */

const BEGIN_MARKER = '*** Begin Patch';
const END_MARKER   = '*** End Patch';
const ADD_PREFIX   = '*** Add File: ';
const UPDATE_PREFIX = '*** Update File: ';
const DELETE_PREFIX = '*** Delete File: ';
const HUNK_HEADER  = '@@';

function parse(patchString) {
  const lines = splitLines(patchString);

  if (lines.length === 0) {
    throw new Error('Patch is empty.');
  }

  let i = 0;

  // Consume leading blank lines
  while (i < lines.length && lines[i].trim() === '') {
    i++;
  }

  if (i >= lines.length || !lines[i].startsWith(BEGIN_MARKER)) {
    throw new Error(
      `Expected "${BEGIN_MARKER}" at line ${i + 1}, got: ${truncate(lines[i])}`
    );
  }
  i++;

  const ops = [];

  while (i < lines.length) {
    const line = lines[i];

    // End marker
    if (line.startsWith(END_MARKER)) {
      i++;
      break;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (line.startsWith(ADD_PREFIX)) {
      const result = parseAddFile(lines, i);
      ops.push(result.op);
      i = result.nextIndex;
    } else if (line.startsWith(UPDATE_PREFIX)) {
      const result = parseUpdateFile(lines, i);
      ops.push(result.op);
      i = result.nextIndex;
    } else if (line.startsWith(DELETE_PREFIX)) {
      const path = line.slice(DELETE_PREFIX.length).trim();
      if (!path) {
        throw new Error(`Empty path in Delete File at line ${i + 1}.`);
      }
      ops.push({ type: 'delete', path });
      i++;
    } else {
      throw new Error(
        `Unexpected line ${i + 1}: ${truncate(line)}. Expected a file operation or "${END_MARKER}".`
      );
    }
  }

  if (ops.length === 0) {
    throw new Error('Patch contains no file operations.');
  }

  return ops;
}

function parseAddFile(lines, startIndex) {
  const headerLine = lines[startIndex];
  const path = headerLine.slice(ADD_PREFIX.length).trim();
  if (!path) {
    throw new Error(`Empty path in Add File at line ${startIndex + 1}.`);
  }

  const contentLines = [];
  let i = startIndex + 1;

  while (i < lines.length) {
    const line = lines[i];

    // Stop at next operation directive
    if (
      line.startsWith(ADD_PREFIX) ||
      line.startsWith(UPDATE_PREFIX) ||
      line.startsWith(DELETE_PREFIX) ||
      line.startsWith(END_MARKER)
    ) {
      break;
    }

    if (line.startsWith('+')) {
      contentLines.push(line.slice(1));
    } else if (line.trim() === '') {
      // Blank lines between add content — include them as empty content lines
      // but only if we're inside an Add block (have already seen + lines)
      if (contentLines.length > 0 || i > startIndex + 1) {
        contentLines.push('');
      }
    } else {
      throw new Error(
        `Expected "+" prefix for Add File content at line ${i + 1}, got: ${truncate(line)}`
      );
    }

    i++;
  }

  return {
    op: { type: 'add', path, content: contentLines.join('\n') + '\n' },
    nextIndex: i,
  };
}

function parseUpdateFile(lines, startIndex) {
  const headerLine = lines[startIndex];
  const path = headerLine.slice(UPDATE_PREFIX.length).trim();
  if (!path) {
    throw new Error(`Empty path in Update File at line ${startIndex + 1}.`);
  }

  const hunks = [];
  let i = startIndex + 1;

  while (i < lines.length) {
    const line = lines[i];

    // Stop at next operation directive
    if (
      line.startsWith(ADD_PREFIX) ||
      line.startsWith(UPDATE_PREFIX) ||
      line.startsWith(DELETE_PREFIX) ||
      line.startsWith(END_MARKER)
    ) {
      break;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (line.startsWith(HUNK_HEADER)) {
      const result = parseHunk(lines, i);
      hunks.push(result.hunk);
      i = result.nextIndex;
    } else {
      throw new Error(
        `Expected hunk header ("@@") at line ${i + 1}, got: ${truncate(line)}`
      );
    }
  }

  if (hunks.length === 0) {
    throw new Error(
      `Update File "${path}" at line ${startIndex + 1} has no hunks.`
    );
  }

  return {
    op: { type: 'update', path, hunks },
    nextIndex: i,
  };
}

function parseHunk(lines, startIndex) {
  // The hunk header line: "@@ optional header text"
  const headerLine = lines[startIndex];
  const header = headerLine.slice(HUNK_HEADER.length).trim();

  const hunkLines = [];
  let i = startIndex + 1;

  while (i < lines.length) {
    const line = lines[i];

    // Stop at next hunk or operation boundary
    if (
      line.startsWith(HUNK_HEADER) ||
      line.startsWith(ADD_PREFIX) ||
      line.startsWith(UPDATE_PREFIX) ||
      line.startsWith(DELETE_PREFIX) ||
      line.startsWith(END_MARKER)
    ) {
      break;
    }

    if (line.trim() === '') {
      // Empty line inside a hunk — treat as context (space prefix implied)
      hunkLines.push({ type: 'context', content: '' });
      i++;
      continue;
    }

    const prefix = line.charAt(0);
    if (prefix === ' ') {
      hunkLines.push({ type: 'context', content: line.slice(1) });
    } else if (prefix === '-') {
      hunkLines.push({ type: 'remove', content: line.slice(1) });
    } else if (prefix === '+') {
      hunkLines.push({ type: 'add', content: line.slice(1) });
    } else {
      throw new Error(
        `Invalid hunk line at ${i + 1}: ${truncate(line)}. Expected " ", "-", or "+" prefix.`
      );
    }

    i++;
  }

  if (hunkLines.length === 0) {
    throw new Error(`Empty hunk at line ${startIndex + 1}.`);
  }

  return {
    hunk: { header, lines: hunkLines },
    nextIndex: i,
  };
}

function splitLines(str) {
  const lines = str.split(/\r?\n/);
  // Keep trailing empty line if input ends with newline
  if (str.endsWith('\n') && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

function truncate(line) {
  if (line === undefined || line === null) return '<end of input>';
  return line.length > 60 ? line.slice(0, 60) + '...' : (line || '<empty>');
}

module.exports = { parse, BEGIN_MARKER, END_MARKER };
