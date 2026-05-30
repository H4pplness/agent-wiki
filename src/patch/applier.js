/**
 * applier.js — Apply parsed file operations to the file system.
 *
 * Supports atomic rollback: if any operation fails, all prior changes
 * are reverted. Backups are stored in memory during the apply phase.
 */

const fs = require('fs');
const path = require('path');
const { resolvePath, domainExists } = require('../domain/resolver');
const { fileExists, readFile } = require('../fs/reader');
const { writeFile } = require('../fs/writer');
const { applyHunk } = require('./locator');
const { print } = require('../output/formatter');

/**
 * Apply a list of file operations to the given domain.
 *
 * @param {string} domain — domain name
 * @param {object[]} ops — parsed operations from parser.js
 */
function applyOps(domain, ops) {
  if (!domainExists(domain)) {
    throw new Error(
      `Domain "${domain}" does not exist. Initialize: agent-wiki ${domain} init --desc "<description>"`
    );
  }

  const backups = [];
  const results = [];

  try {
    for (const op of ops) {
      const result = applyOneOp(domain, op, backups);
      results.push(result);
    }
  } catch (err) {
    // Rollback all changes
    rollback(backups);
    throw err;
  }

  // Success — report what was done
  for (const r of results) {
    print(`  ${r.icon} ${r.path} — ${r.action}`);
  }
  print(`✓ Applied ${results.length} operation(s)`);
}

function applyOneOp(domain, op, backups) {
  const absPath = resolvePath(domain, op.path);

  switch (op.type) {
    case 'add':
      return applyAdd(absPath, op, backups);
    case 'update':
      return applyUpdate(absPath, op, backups);
    case 'delete':
      return applyDelete(absPath, op, backups);
    default:
      throw new Error(`Unknown operation type: ${op.type}`);
  }
}

function applyAdd(absPath, op, backups) {
  if (fileExists(absPath)) {
    throw new Error(
      `Cannot add "${op.path}": file already exists. Use Update File to modify it.`
    );
  }

  writeFile(absPath, op.content);
  backups.push({ type: 'add', path: absPath });
  return { icon: '+', path: op.path, action: 'created' };
}

function applyUpdate(absPath, op, backups) {
  if (!fileExists(absPath)) {
    throw new Error(
      `Cannot update "${op.path}": file does not exist. Use Add File to create it.`
    );
  }

  const originalContent = readFile(absPath);
  backups.push({ type: 'update', path: absPath, original: originalContent });

  let lines = splitLines(originalContent);
  const eol = originalContent.includes('\r\n') ? '\r\n' : '\n';
  const endsWithEol = originalContent.endsWith('\n');

  for (const hunk of op.hunks) {
    lines = applyHunk(lines, hunk);
  }

  const newContent = lines.join(eol) + (endsWithEol ? eol : '');
  fs.writeFileSync(absPath, newContent, 'utf8');

  return { icon: '~', path: op.path, action: `updated (${op.hunks.length} hunk(s))` };
}

function applyDelete(absPath, op, backups) {
  if (!fileExists(absPath)) {
    throw new Error(
      `Cannot delete "${op.path}": file does not exist.`
    );
  }

  const originalContent = readFile(absPath);
  backups.push({ type: 'delete', path: absPath, original: originalContent });
  fs.unlinkSync(absPath);

  return { icon: '-', path: op.path, action: 'deleted' };
}

function rollback(backups) {
  // Rollback in reverse order
  for (let i = backups.length - 1; i >= 0; i--) {
    const b = backups[i];
    try {
      switch (b.type) {
        case 'add':
          if (fs.existsSync(b.path)) {
            fs.unlinkSync(b.path);
          }
          break;
        case 'update':
        case 'delete':
          fs.writeFileSync(b.path, b.original, 'utf8');
          break;
      }
    } catch (e) {
      // Best-effort rollback — log but don't hide the original error
      // (the original error is what we throw after rollback)
    }
  }
}

function splitLines(content) {
  const lines = content.split(/\r?\n/);
  if (content.endsWith('\n')) lines.pop();
  return lines;
}

module.exports = { applyOps };
