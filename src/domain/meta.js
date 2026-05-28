const fs = require('fs');
const { getMetaPath } = require('./resolver');

function readMeta(domain) {
  const metaPath = getMetaPath(domain);
  if (!fs.existsSync(metaPath)) return null;
  return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
}

function writeMeta(domain, data) {
  const metaPath = getMetaPath(domain);
  const dir = require('path').dirname(metaPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
}

module.exports = { readMeta, writeMeta };
