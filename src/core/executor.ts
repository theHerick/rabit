/**
 * Filesystem executor.
 * Applies a batch of structured actions (write/move/delete) inside a single
 * working directory. All paths are normalised and constrained to the workDir
 * tree — any attempt to escape via "../" is rejected.
 */

import * as fs from 'fs';
import * as path from 'path';
import { say } from '../terminal/voices';

export type Action =
  | { type: 'write'; path: string; content: string }
  | { type: 'move'; from: string; to: string }
  | { type: 'delete'; path: string };

export interface ApplyResult {
  applied: Action[];
  errors: Array<{ action: Action; error: string }>;
}

function safeJoin(workDir: string, rel: string): string {
  const trimmed = rel.replace(/^\/+/, '').replace(/^\.\//, '');
  const full = path.resolve(workDir, trimmed);
  const rootReal = path.resolve(workDir);
  if (full !== rootReal && !full.startsWith(rootReal + path.sep)) {
    throw new Error(`path fora do workdir: ${rel}`);
  }
  return full;
}

function write(workDir: string, rel: string, content: string): void {
  const full = safeJoin(workDir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
  say('system', `write ${path.relative(workDir, full)} (${Buffer.byteLength(content, 'utf-8')} bytes)`);
}

function move(workDir: string, from: string, to: string): void {
  const src = safeJoin(workDir, from);
  const dst = safeJoin(workDir, to);
  if (!fs.existsSync(src)) throw new Error(`origem inexistente: ${from}`);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.renameSync(src, dst);
  say('system', `move ${path.relative(workDir, src)} -> ${path.relative(workDir, dst)}`);
}

function remove(workDir: string, rel: string): void {
  const full = safeJoin(workDir, rel);
  if (!fs.existsSync(full)) return;
  fs.rmSync(full, { recursive: true, force: true });
  say('system', `delete ${path.relative(workDir, full)}`);
}

export function applyActions(workDir: string, actions: Action[]): ApplyResult {
  const result: ApplyResult = { applied: [], errors: [] };
  for (const action of actions) {
    try {
      if (action.type === 'write') {
        write(workDir, action.path, action.content);
      } else if (action.type === 'move') {
        move(workDir, action.from, action.to);
      } else if (action.type === 'delete') {
        remove(workDir, action.path);
      }
      result.applied.push(action);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ action, error: msg });
    }
  }
  return result;
}

export function listProjectTree(workDir: string, maxDepth = 4): string[] {
  const rootReal = path.resolve(workDir);
  const out: string[] = [];
  const walk = (dir: string, depth: number): void => {
    if (depth > maxDepth) return;
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(rootReal, full);
      if (entry.isDirectory()) {
        out.push(rel + '/');
        walk(full, depth + 1);
      } else {
        out.push(rel);
      }
    }
  };
  walk(rootReal, 0);
  return out;
}

export function readAllFiles(workDir: string, maxBytes = 32_000): Array<{ path: string; content: string }> {
  const rootReal = path.resolve(workDir);
  const out: Array<{ path: string; content: string }> = [];
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const size = fs.statSync(full).size;
        if (size > maxBytes) continue;
        try {
          const content = fs.readFileSync(full, 'utf-8');
          out.push({ path: path.relative(rootReal, full), content });
        } catch {
          // binary or unreadable; skip
        }
      }
    }
  };
  walk(rootReal);
  return out;
}
