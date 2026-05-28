const fs = require('fs');
const path = require('path');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function listTree(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const lines = [];
  entries.forEach((entry, i) => {
    const isLast = i === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';
    lines.push(prefix + connector + entry.name);
    if (entry.isDirectory()) {
      lines.push(...listTree(path.join(dir, entry.name), prefix + childPrefix));
    }
  });
  return lines;
}

function listDomainsDir(domainsDir) {
  if (!fs.existsSync(domainsDir)) return [];
  return fs.readdirSync(domainsDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
}

module.exports = { readFile, fileExists, listTree, listDomainsDir };
