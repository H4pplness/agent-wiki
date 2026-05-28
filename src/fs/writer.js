const fs = require('fs');
const path = require('path');

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function replaceInFile(filePath, oldStr, newStr) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(oldStr)) return false;
  const updated = content.replace(oldStr, newStr);
  fs.writeFileSync(filePath, updated, 'utf8');
  return true;
}

function removeDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

module.exports = { writeFile, replaceInFile, removeDir };
