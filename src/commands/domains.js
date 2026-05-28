const path = require('path');
const { getRootDir } = require('../domain/config');
const { readMeta } = require('../domain/meta');
const { listDomainsDir } = require('../fs/reader');
const { print } = require('../output/formatter');

function run() {
  const domainsDir = path.join(getRootDir(), 'domains');
  const names = listDomainsDir(domainsDir);
  if (names.length === 0) {
    print('No domains yet. Create one: agent-wiki <domain> init --desc "<description>"');
    return;
  }
  print('');
  print(`Domains (${names.length}):`);
  print('');
  const maxLen = Math.max(...names.map(n => n.length));
  names.forEach(name => {
    const meta = readMeta(name);
    const desc = (meta && meta.description) || '';
    const truncated = desc.length > 60 ? desc.slice(0, 57) + '...' : desc;
    print(`  ${name.padEnd(maxLen + 2)} ${truncated}`);
  });
  print('');
}

module.exports = { run };
