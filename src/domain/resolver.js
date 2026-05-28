const fs = require('fs');
const path = require('path');
const { getRootDir } = require('./config');

function getDomainDir(domain) {
  return path.join(getRootDir(), 'domains', domain);
}

function domainExists(domain) {
  return fs.existsSync(getDomainDir(domain));
}

function getSchemaPath(domain) {
  return path.join(getDomainDir(domain), 'schema.md');
}

function getMetaPath(domain) {
  return path.join(getDomainDir(domain), 'meta.json');
}

function getWikiDir(domain) {
  return path.join(getDomainDir(domain), 'wiki');
}

function resolvePath(domain, filePath) {
  // filePath có thể là "schema.md" hoặc "wiki/something.md"
  return path.join(getDomainDir(domain), filePath);
}

module.exports = { getDomainDir, domainExists, getSchemaPath, getMetaPath, getWikiDir, resolvePath };
