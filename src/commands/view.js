const { domainExists, resolvePath } = require('../domain/resolver');
const { readFile, fileExists } = require('../fs/reader');
const { print, printErr } = require('../output/formatter');

function run(domain, filePath) {
  if (!domainExists(domain)) {
    printErr(`Domain "${domain}" does not exist. Initialize: agent-wiki ${domain} init --desc "<description>"`);
    process.exit(1);
  }
  if (!filePath) {
    printErr('Usage: agent-wiki <domain> view <path>');
    process.exit(1);
  }
  const absPath = resolvePath(domain, filePath);
  if (!fileExists(absPath)) {
    printErr(`File "${filePath}" does not exist. Create it: agent-wiki ${domain} write ${filePath} "<content>"`);
    process.exit(1);
  }
  print(readFile(absPath));
}

module.exports = { run };
