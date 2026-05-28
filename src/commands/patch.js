const fs = require('fs');
const path = require('path');
const { domainExists, resolvePath } = require('../domain/resolver');
const { fileExists } = require('../fs/reader');
const { patchFile } = require('../fs/writer');
const { print, printErr } = require('../output/formatter');

function run(domain, filePath, patchArg, args = {}) {
  if (!domainExists(domain)) {
    printErr(`Domain "${domain}" does not exist. Initialize: agent-wiki ${domain} init --desc "<description>"`);
    process.exit(1);
  }
  if (!filePath) {
    printUsage();
    process.exit(1);
  }

  const patch = readPatch(patchArg, args.file);
  if (!patch) {
    printUsage();
    process.exit(1);
  }

  const absPath = resolvePath(domain, filePath);
  if (!fileExists(absPath)) {
    printErr(`File "${filePath}" does not exist.`);
    process.exit(1);
  }

  try {
    patchFile(absPath, patch);
  } catch (error) {
    printErr(error.message);
    process.exit(1);
  }

  print(`✓ Patched: ${filePath}`);
}

function readPatch(patchArg, patchFilePath) {
  if (patchFilePath) {
    const absPath = path.resolve(patchFilePath);
    if (!fs.existsSync(absPath)) {
      printErr(`Patch file "${patchFilePath}" does not exist.`);
      process.exit(1);
    }
    return fs.readFileSync(absPath, 'utf8');
  }
  if (patchArg !== undefined) {
    return patchArg;
  }
  if (!process.stdin.isTTY) {
    return fs.readFileSync(0, 'utf8');
  }
  return undefined;
}

function printUsage() {
  printErr('Usage: agent-wiki <domain> patch <path> --file <patch-file>');
  printErr('   or: agent-wiki <domain> patch <path> "<patch>"');
  printErr('   or: agent-wiki <domain> patch <path> < patch.diff');
}

module.exports = { run };
