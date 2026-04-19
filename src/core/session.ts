/**
 * Session persistence.
 * Sessions are JSON files under ~/.cllama/sessions keyed by id.
 * They are append-only from the user's point of view; we re-write on each
 * turn so crashes cannot corrupt mid-message state.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SESSIONS_DIR, ensureDirectories, shortId } from '../tools/paths';
import { SessionData, SessionMessage } from '../tools/types';

export function newSession(title: string): SessionData {
  ensureDirectories();
  const now = new Date().toISOString();
  return {
    id: shortId('sess'),
    createdAt: now,
    updatedAt: now,
    title: title || 'Sessao sem titulo',
    messages: []
  };
}

export function loadSession(id: string): SessionData | null {
  const file = path.join(SESSIONS_DIR, id + '.json');
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionData): void {
  ensureDirectories();
  session.updatedAt = new Date().toISOString();
  const file = path.join(SESSIONS_DIR, session.id + '.json');
  fs.writeFileSync(file, JSON.stringify(session, null, 2), 'utf-8');
}

export function appendMessage(session: SessionData, role: SessionMessage['role'], content: string): void {
  session.messages.push({
    role,
    content,
    timestamp: new Date().toISOString()
  });
}

export function clearAllSessions(): number {
  if (!fs.existsSync(SESSIONS_DIR)) return 0;
  const files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    try {
      fs.unlinkSync(path.join(SESSIONS_DIR, f));
    } catch {
      // ignore
    }
  }
  return files.length;
}
