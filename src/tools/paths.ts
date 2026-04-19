/**
 * Filesystem path utilities.
 * Resolves home directory anchors and ensures the ~/.rabit tree exists.
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export const HOME = os.homedir();
export const CLLAMA_ROOT = path.join(HOME, '.rabit');
export const SESSIONS_DIR = path.join(CLLAMA_ROOT, 'sessions');
export const PROJECTS_DIR = path.join(CLLAMA_ROOT, 'projects');
export const SKILLS_DIR = path.join(CLLAMA_ROOT, 'skills');
export const MEMORY_DIR = path.join(CLLAMA_ROOT, 'memory');
export const SANDBOX_DIR = path.join(CLLAMA_ROOT, 'sandbox');
export const LOGS_DIR = path.join(CLLAMA_ROOT, 'logs');
export const DOCS_DIR = path.join(CLLAMA_ROOT, 'docs');

export function ensureDirectories(): void {
  const dirs = [
    CLLAMA_ROOT, SESSIONS_DIR, PROJECTS_DIR, SKILLS_DIR, MEMORY_DIR,
    SANDBOX_DIR, LOGS_DIR, DOCS_DIR,
    path.join(DOCS_DIR, 'architect'),
    path.join(DOCS_DIR, 'coder')
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function prettyCwd(): string {
  const cwd = process.cwd();
  if (cwd === HOME) return '~';
  if (cwd.startsWith(HOME + path.sep)) {
    return '~' + cwd.substring(HOME.length);
  }
  return cwd;
}

export function shortId(prefix = ''): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${ts}_${rnd}` : `${ts}_${rnd}`;
}
