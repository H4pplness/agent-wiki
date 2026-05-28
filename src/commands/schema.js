const { domainExists, getSchemaPath } = require('../domain/resolver');
const { readMeta } = require('../domain/meta');
const { readFile, fileExists } = require('../fs/reader');
const { writeFile } = require('../fs/writer');
const { print, printErr, separator } = require('../output/formatter');

function run(domain, subCmd, positional) {
  if (!domainExists(domain)) {
    printErr(`Domain "${domain}" does not exist. Initialize: agent-wiki ${domain} init --desc "<description>"`);
    process.exit(1);
  }

  if (subCmd === 'edit') {
    const content = positional[0];
    if (!content) {
      printErr('Missing content. Usage: agent-wiki <domain> schema edit "<content>"');
      process.exit(1);
    }
    writeFile(getSchemaPath(domain), content);
    print(`✓ Schema for "${domain}" updated.`);
    return;
  }

  const meta = readMeta(domain);
  const schemaPath = getSchemaPath(domain);
  const schemaContent = fileExists(schemaPath) ? readFile(schemaPath) : '';

  separator();
  print(`Domain: ${domain}`);
  if (meta && meta.description) print(`Desc  : ${meta.description}`);
  separator();
  print('');
  print(schemaContent);
}

module.exports = { run };
