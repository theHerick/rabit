/**
 * Lightweight JSONL-backed vector store.
 * LanceDB's native binary proved unstable on some Node/glibc setups, so the
 * Skill Forge and /brain memory share this simpler persistence layer. The
 * public surface mirrors the LanceDB subset we actually used (add, search,
 * delete, list) so agent code does not care which backend is underneath.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MEMORY_DIR, ensureDirectories } from '../tools/paths';
import { cosineSimilarity } from '../tools/cosine';

type Row = Record<string, unknown> & { id: string; vector?: number[] };

export interface SearchHit<T extends Row> {
  row: T;
  similarity: number;
}

export class JsonlTable<T extends Row> {
  private rows: T[] = [];
  private loaded = false;

  constructor(private readonly filePath: string) {}

  private load(): void {
    if (this.loaded) return;
    if (fs.existsSync(this.filePath)) {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        try {
          this.rows.push(JSON.parse(trimmed) as T);
        } catch {
          // skip malformed lines
        }
      }
    }
    this.loaded = true;
  }

  private persist(): void {
    ensureDirectories();
    const body = this.rows.map((r) => JSON.stringify(r)).join('\n');
    fs.writeFileSync(this.filePath, body + (body.length > 0 ? '\n' : ''), 'utf-8');
  }

  add(row: T): void {
    this.load();
    this.rows.push(row);
    this.persist();
  }

  update(id: string, patch: Partial<T>): void {
    this.load();
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx >= 0) {
      this.rows[idx] = { ...this.rows[idx], ...patch } as T;
      this.persist();
    }
  }

  deleteById(id: string): boolean {
    this.load();
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.id !== id);
    if (this.rows.length !== before) {
      this.persist();
      return true;
    }
    return false;
  }

  all(): T[] {
    this.load();
    return [...this.rows];
  }

  search(vector: number[], limit = 1): SearchHit<T>[] {
    this.load();
    const scored = this.rows
      .filter((r) => Array.isArray(r.vector))
      .map((r) => ({
        row: r,
        similarity: cosineSimilarity(vector, r.vector as number[])
      }))
      .sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
  }

  count(): number {
    this.load();
    return this.rows.length;
  }

  truncate(): void {
    this.rows = [];
    this.loaded = true;
    if (fs.existsSync(this.filePath)) {
      fs.unlinkSync(this.filePath);
    }
  }
}

export function openTable<T extends Row>(name: string): JsonlTable<T> {
  ensureDirectories();
  return new JsonlTable<T>(path.join(MEMORY_DIR, name + '.jsonl'));
}
