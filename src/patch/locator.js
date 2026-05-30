/**
 * locator.js — Find the position of a hunk in file content using context lines.
 *
 * A hunk matches when ALL context + remove lines appear consecutively
 * in the file at a specific position. We search for the longest unique
 * subsequence to avoid ambiguous matches.
 */

/**
 * Find the line index in `fileLines` where `hunk.lines` applies.
 *
 * The search pattern is built from context + remove lines (the "before" state).
 * Returns the starting index of the match.
 * Throws if no match or multiple ambiguous matches are found.
 *
 * @param {string[]} fileLines — file content split by newline (without trailing empty)
 * @param {object} hunk — { header, lines: [{type, content}, ...] }
 * @returns {number} start index in fileLines
 */
function locate(fileLines, hunk) {
  const searchPattern = buildSearchPattern(hunk.lines);

  if (searchPattern.length === 0) {
    throw new Error(
      'Hunk has no context or remove lines — cannot locate position.'
    );
  }

  const matches = findAllMatches(fileLines, searchPattern);

  if (matches.length === 0) {
    throw new Error(
      `Hunk context not found in file. Search pattern:\n${formatPattern(searchPattern)}`
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `Ambiguous hunk: found ${matches.length} matches for the same context. Add more context lines to disambiguate.`
    );
  }

  return matches[0];
}

/**
 * Build the search pattern from hunk lines.
 * The pattern consists of context + remove lines (the "old" state).
 */
function buildSearchPattern(hunkLines) {
  return hunkLines
    .filter((hl) => hl.type === 'context' || hl.type === 'remove')
    .map((hl) => hl.content);
}

/**
 * Find all occurrences of `pattern` as a consecutive subsequence in `lines`.
 */
function findAllMatches(lines, pattern) {
  const matches = [];
  for (let i = 0; i <= lines.length - pattern.length; i++) {
    let matched = true;
    for (let j = 0; j < pattern.length; j++) {
      if (lines[i + j] !== pattern[j]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      matches.push(i);
    }
  }
  return matches;
}

/**
 * Apply a single hunk to file content, returning the new content.
 *
 * @param {string[]} fileLines
 * @param {object} hunk
 * @returns {string[]} new file lines
 */
function applyHunk(fileLines, hunk) {
  const startIndex = locate(fileLines, hunk);

  const oldLines = hunk.lines
    .filter((hl) => hl.type === 'context' || hl.type === 'remove')
    .map((hl) => hl.content);

  const newLines = hunk.lines
    .filter((hl) => hl.type === 'context' || hl.type === 'add')
    .map((hl) => hl.content);

  const result = [...fileLines];
  result.splice(startIndex, oldLines.length, ...newLines);
  return result;
}

function formatPattern(pattern) {
  return pattern
    .map((l) => `  "${l}"`)
    .join('\n');
}

module.exports = { locate, applyHunk };

/**
 * @typedef {object} HunkLine
 * @property {'context'|'remove'|'add'} type
 * @property {string} content
 */

/**
 * @typedef {object} Hunk
 * @property {string} header
 * @property {HunkLine[]} lines
 */
