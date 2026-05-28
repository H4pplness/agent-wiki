const { domainExists, resolvePath } = require('../domain/resolver');
const { writeFile } = require('../fs/writer');
const { print, printErr } = require('../output/formatter');

function run(domain, filePath, content) {
  if (!domainExists(domain)) {
    printErr(`Domain "${domain}" does not exist. Initialize: agent-wiki ${domain} init --desc "<description>"`);
    process.exit(1);
  }
  if (!filePath || content === undefined) {
    printErr('Usage: agent-wiki <domain> write <path> "<content>"');
    process.exit(1);
  }
  try {
    writeFile(resolvePath(domain, filePath), content);
    print(`✓ Written: ${filePath}`);
  } catch (e) {
    printErr(`Cannot write to ${filePath}. Check directory permissions.`);
    process.exit(2);
  }
}

module.exports = { run };
