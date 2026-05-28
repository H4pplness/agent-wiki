const { domainExists, getDomainDir } = require('../domain/resolver');
const { removeDir } = require('../fs/writer');
const { print, printErr } = require('../output/formatter');

function run(domain, args) {
  if (!domainExists(domain)) {
    printErr(`Domain "${domain}" does not exist.`);
    process.exit(1);
  }
  if (!args.confirm) {
    printErr(`Add --confirm to confirm deleting domain "${domain}".`);
    process.exit(1);
  }
  removeDir(getDomainDir(domain));
  print(`✓ Domain "${domain}" deleted.`);
}

module.exports = { run };
