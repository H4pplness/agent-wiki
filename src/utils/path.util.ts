import * as path from 'path';
import * as os from 'os';

const BASE_DIR = path.join(os.homedir(), '.agent-wiki');

export function getBaseDir(): string {
  return BASE_DIR;
}

export function getAgentPath(agentName: string): string {
  return path.join(BASE_DIR, 'agents', agentName);
}

export function getSchemaPath(agentName: string): string {
  return path.join(getAgentPath(agentName), 'schema.md');
}

export function getIndexPath(agentName: string): string {
  return path.join(getAgentPath(agentName), 'index.md');
}

export function getLogPath(agentName: string): string {
  return path.join(getAgentPath(agentName), 'log.md');
}

export function getConfigPath(): string {
  return path.join(BASE_DIR, 'config.json');
}

export function resolveWikiRef(agentName: string, ref: string): string {
  const safe = path.normalize(ref).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(getAgentPath(agentName), safe);
}

export function validateAgentName(name: string): true | string {
  if (!/^[a-z0-9\-_]{1,64}$/.test(name)) {
    return 'Agent name must be 1-64 characters, only lowercase letters, digits, hyphens, and underscores.';
  }
  return true;
}

export function validateRef(ref: string): true | string {
  if (ref.includes('..')) {
    return 'Reference must not contain path traversal patterns.';
  }
  if (ref === 'schema') {
    return true;
  }
  if (!ref.startsWith('wiki/') || !ref.endsWith('.md')) {
    return 'Reference must start with "wiki/" and end with ".md".';
  }
  return true;
}
