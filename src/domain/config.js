const fs = require('fs');
const path = require('path');
const os = require('os');

const VERSION = '3.0.0';

function getRootDir() {
  return process.env.AGENT_WIKI_DIR || path.join(os.homedir(), '.agent-wiki');
}

function getConfigPath() {
  return path.join(getRootDir(), 'config.json');
}

function getConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return { version: VERSION };
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return { version: VERSION };
  }
}

function saveConfig(data) {
  const rootDir = getRootDir();
  if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify({ version: VERSION, ...data }, null, 2));
}

module.exports = { getRootDir, getConfig, saveConfig, VERSION };
