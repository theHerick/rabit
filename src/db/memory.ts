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
    parentId: rec.parentId ?? ''
  };
}

function fromRow(row: MemoryRow): MemoryRecord {
  const parent = row.parentId ?? '';
  return {
    id: row.id,
    category: row.category as MemoryRecord['category'],
    content: row.content,
    vector: row.vector,
    timestamp: row.timestamp,
    parentId: parent.length > 0 ? parent : undefined
  };
}

export async function remember(opts: {
  category: MemoryRecord['category'];
  content: string;
  parentId?: string;
}): Promise<MemoryRecord> {
  const vector = await embed(opts.content.slice(0, 2048));
  const rec: MemoryRecord = {
    id: shortId('mem'),
    category: opts.category,
    content: opts.content,
    vector,
    timestamp: new Date().toISOString(),
    parentId: opts.parentId
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
