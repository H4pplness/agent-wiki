const { domainExists, getWikiDir, resolvePath } = require('../domain/resolver');
const { listTree } = require('../fs/reader');
const { print, printErr } = require('../output/formatter');

function run(domain, subPath) {
  if (!domainExists(domain)) {
    printErr(`Domain "${domain}" does not exist. Initialize: agent-wiki ${domain} init --desc "<description>"`);
    process.exit(1);
  }
  const targetDir = subPath ? resolvePath(domain, subPath) : getWikiDir(domain);
  const lines = listTree(targetDir);
  if (lines.length === 0) { print('(No files found)'); return; }
  print(subPath || 'wiki/');
  lines.forEach(l => print(l));
}

module.exports = { run };
