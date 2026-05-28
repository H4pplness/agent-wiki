const path = require('path');
const { domainExists, getDomainDir, getSchemaPath, getWikiDir } = require('../domain/resolver');
const { writeMeta } = require('../domain/meta');
const { getSchemaTemplate, getIndexTemplate } = require('../domain/template');
const { writeFile } = require('../fs/writer');
const { print, printErr } = require('../output/formatter');

function run(domain, args) {
  const desc = args.desc || args.d;

  if (!desc) {
    printErr('--desc is required. Example: --desc "Description of your domain"');
    process.exit(1);
  }

  if (domainExists(domain)) {
    printErr(`Domain "${domain}" already exists. View schema: agent-wiki ${domain} schema`);
    process.exit(1);
  }

  const domainDir = getDomainDir(domain);

  try {
    writeMeta(domain, {
      domain,
      description: desc,
      created_at: new Date().toISOString(),
      schema_version: '1',
    });
    writeFile(getSchemaPath(domain), getSchemaTemplate(domain));
    writeFile(path.join(getWikiDir(domain), 'index.md'), getIndexTemplate(domain));
  } catch (e) {
    printErr(`Cannot write to ${domainDir}. Check directory permissions.`);
    process.exit(2);
  }

  print('');
  print(`✓ Domain "${domain}" initialized`);
  print('');
  print(`  Description: ${desc}`);
  print(`  Path       : ${domainDir}`);
  print('');
  print('Next steps:');
  print(`  agent-wiki ${domain} schema        ← Read schema`);
  print(`  agent-wiki ${domain} schema edit   ← Edit schema`);
  print('');
}

module.exports = { run };
