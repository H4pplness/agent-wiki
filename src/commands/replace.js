const { domainExists, resolvePath } = require('../domain/resolver');
const { fileExists } = require('../fs/reader');
const { replaceInFile } = require('../fs/writer');
const { print, printErr } = require('../output/formatter');

function run(domain, filePath, oldStr, newStr) {
  if (!domainExists(domain)) {
    printErr(`Domain "${domain}" does not exist. Initialize: agent-wiki ${domain} init --desc "<description>"`);
    process.exit(1);
  }
  if (!filePath || oldStr === undefined || newStr === undefined) {
    printErr('Usage: agent-wiki <domain> replace <path> "<old>" "<new>"');
    process.exit(1);
  }
  const absPath = resolvePath(domain, filePath);
  if (!fileExists(absPath)) {
    printErr(`File "${filePath}" does not exist.`);
    process.exit(1);
  }
  if (!replaceInFile(absPath, oldStr, newStr)) {
    printErr('String not found in file.');
    process.exit(1);
  }
  print(`✓ Replaced in: ${filePath}`);
}

module.exports = { run };
