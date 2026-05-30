/**
 * apply_patch.js — CLI command for the RFC-01 apply_patch feature.
 *
 * Reads a patch from stdin (heredoc), --file, or positional argument,
 * parses it, and applies the file operations to a domain.
 *
 * Usage:
 *   agent-wiki <domain> apply_patch << 'EOF'
 *   *** Begin Patch
 *   ...
 *   *** End Patch
 *   EOF
 *
 *   agent-wiki <domain> apply_patch --file patch.txt
 *   agent-wiki <domain> apply_patch "<patch string>"
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('../patch/parser');
const { applyOps } = require('../patch/applier');
const { print, printErr } = require('../output/formatter');

function run(domain, patchArg, args = {}) {
  const patch = readPatch(patchArg, args.file);

  if (!patch) {
    printUsage();
    process.exit(1);
  }

  let ops;
  try {
    ops = parse(patch);
  } catch (err) {
    printErr(`Parse error: ${err.message}`);
    process.exit(1);
  }

  try {
    applyOps(domain, ops);
  } catch (err) {
    printErr(`Apply error: ${err.message}`);
    process.exit(1);
  }
}

function readPatch(patchArg, patchFilePath) {
  // Priority 1: --file flag
  if (patchFilePath) {
    const absPath = path.resolve(patchFilePath);
    if (!fs.existsSync(absPath)) {
      printErr(`Patch file "${patchFilePath}" does not exist.`);
      process.exit(1);
    }
    return fs.readFileSync(absPath, 'utf8');
  }

  // Priority 2: positional argument
  if (patchArg !== undefined && patchArg.trim() !== '') {
    return patchArg;
  }

  // Priority 3: stdin (heredoc or pipe)
  if (!process.stdin.isTTY) {
    return fs.readFileSync(0, 'utf8');
  }

  return undefined;
}

function printUsage() {
  printErr('Usage:');
  printErr('  agent-wiki <domain> apply_patch << \'EOF\'');
  printErr('  *** Begin Patch');
  printErr('  ...');
  printErr('  *** End Patch');
  printErr('  EOF');
  printErr('');
  printErr('  agent-wiki <domain> apply_patch --file <patch-file>');
  printErr('  agent-wiki <domain> apply_patch "<patch>"');
}

module.exports = { run };
