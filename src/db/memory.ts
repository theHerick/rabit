/**
 * Vector memory backing the /brain reserved command.
 * Stores structured records (commands, file reads, decisions) and renders
 * an ASCII tree of accumulated knowledge on demand.
 */

import chalk from 'chalk';
import { openTable, JsonlTable } from './lance';
import { embed } from '../tools/ollama';
import { shortId } from '../tools/paths';
import { MemoryRecord } from '../tools/types';

interface MemoryRow extends Record<string, unknown> {
  id: string;
  category: string;
  content: string;
  vector: number[];
  timestamp: string;
  parentId: string;
  metadata: string; // JSON string
}

let tableSingleton: JsonlTable<MemoryRow> | null = null;
function table(): JsonlTable<MemoryRow> {
  if (!tableSingleton) tableSingleton = openTable<MemoryRow>('memory');
  return tableSingleton;
}

function toRow(rec: MemoryRecord): MemoryRow {
  return {
    id: rec.id,
    category: rec.category,
    content: rec.content,
    vector: rec.vector,
    timestamp: rec.timestamp,
    parentId: rec.parentId ?? '',
    metadata: JSON.stringify(rec.metadata ?? {})
  };
}

function fromRow(row: MemoryRow): MemoryRecord {
  const parent = row.parentId ?? '';
  let metadata = {};
  try {
    metadata = JSON.parse(row.metadata || '{}');
  } catch {}

  return {
    id: row.id,
    category: row.category as MemoryRecord['category'],
    content: row.content,
    vector: row.vector,
    timestamp: row.timestamp,
    parentId: parent.length > 0 ? parent : undefined,
    metadata
  };
}

export async function remember(opts: {
  category: MemoryRecord['category'];
  content: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}): Promise<MemoryRecord> {
  const vector = await embed(opts.content.slice(0, 2048));
  const rec: MemoryRecord = {
    id: shortId('mem'),
    category: opts.category,
    content: opts.content,
    vector,
    timestamp: new Date().toISOString(),
    parentId: opts.parentId,
    metadata: opts.metadata
  };
  try {
    table().add(toRow(rec));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(chalk.yellow('[ Memory ] ') + 'failed to index: ' + msg);
  }
  return rec;
}

export async function listAll(): Promise<MemoryRecord[]> {
  return table()
    .all()
    .map(fromRow)
    .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
}

export async function wipeMemory(): Promise<void> {
  table().truncate();
  tableSingleton = null;
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, ma = 0, mb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    ma += a[i] * a[i];
    mb += b[i] * b[i];
  }
  return dot / (Math.sqrt(ma) * Math.sqrt(mb));
}

/**
 * Search memories semantically using vector similarity.
 */
export async function searchMemories(query: string, opts: {
  category?: MemoryRecord['category'];
  limit?: number;
  minScore?: number;
} = {}): Promise<MemoryRecord[]> {
  const queryVector = await embed(query.slice(0, 2048));
  const limit = opts.limit ?? 5;
  const minScore = opts.minScore ?? 0.7;

  let all = table().all().map(fromRow);
  if (opts.category) {
    all = all.filter(r => r.category === opts.category);
  }

  const scored = all.map(rec => ({
    rec,
    score: cosineSimilarity(queryVector, rec.vector)
  }));

  return scored
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.rec);
}

/**
 * Render an ASCII tree grouped by category, then by day, then by record.
 * This is the payload of the reserved /brain terminal command.
 */
export async function renderBrain(): Promise<string> {
  const records = await listAll();
  if (records.length === 0) {
    return chalk.gray('  (memory empty)');
  }

  const byCategory = new Map<string, MemoryRecord[]>();
  for (const r of records) {
    const list = byCategory.get(r.category) ?? [];
    list.push(r);
    byCategory.set(r.category, list);
  }

  const lines: string[] = [];
  lines.push(chalk.bold.cyan('/brain') + chalk.gray('  -  ' + records.length + ' records'));
  lines.push(chalk.gray('.'));

  const categories = [...byCategory.keys()].sort();
  categories.forEach((cat, catIdx) => {
    const isLastCat = catIdx === categories.length - 1;
    const catPrefix = isLastCat ? '`-- ' : '|-- ';
    const subPrefix = isLastCat ? '    ' : '|   ';
    lines.push(chalk.gray(catPrefix) + chalk.bold.yellow(cat));

    const items = byCategory.get(cat) ?? [];
    const byDay = new Map<string, MemoryRecord[]>();
    for (const item of items) {
      const day = item.timestamp.slice(0, 10);
      const list = byDay.get(day) ?? [];
      list.push(item);
      byDay.set(day, list);
    }
    const days = [...byDay.keys()].sort();
    days.forEach((day, dayIdx) => {
      const isLastDay = dayIdx === days.length - 1;
      const dayPrefix = isLastDay ? '`-- ' : '|-- ';
      const leafPrefix = isLastDay ? '    ' : '|   ';
      lines.push(chalk.gray(subPrefix + dayPrefix) + chalk.green(day));
      const dayItems = byDay.get(day) ?? [];
      dayItems.forEach((rec, recIdx) => {
        const isLastRec = recIdx === dayItems.length - 1;
        const recPrefix = isLastRec ? '`-- ' : '|-- ';
        const preview = rec.content.replace(/\s+/g, ' ').slice(0, 80);
        lines.push(
          chalk.gray(subPrefix + leafPrefix + recPrefix) +
            chalk.white(preview) +
            chalk.gray('  [' + rec.id + ']')
        );
      });
    });
  });

  return lines.join('\n');
}
