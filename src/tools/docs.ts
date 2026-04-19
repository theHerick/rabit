import * as fs from 'fs';
import * as path from 'path';
import { CLLAMA_ROOT } from './paths';

export type DocAgent = 'architect' | 'coder';

export const DOCS_DIR = path.join(CLLAMA_ROOT, 'docs');
export const ARCHITECT_DOCS_DIR = path.join(DOCS_DIR, 'architect');
export const CODER_DOCS_DIR = path.join(DOCS_DIR, 'coder');

function agentDir(agent: 'architect' | 'coder'): string {
    return agent === 'architect' ? ARCHITECT_DOCS_DIR : CODER_DOCS_DIR;
}

export function ensureDocsDirs(): void {
    for (const dir of [DOCS_DIR, ARCHITECT_DOCS_DIR, CODER_DOCS_DIR]) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

export interface DocInfo {
    name: string;
    size: number;
    addedAt: string;
    fullPath: string;
}

export function listDocs(agent: 'architect' | 'coder'): DocInfo[] {
    const dir = agentDir(agent);
    ensureDocsDirs();
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((f) => !f.startsWith('.'))
        .map((f) => {
            const fullPath = path.join(dir, f);
            const stat = fs.statSync(fullPath);
            return {
                name: f,
                size: stat.size,
                addedAt: stat.mtime.toISOString().slice(0, 16).replace('T', ' '),
                fullPath
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

export function addDoc(agent: 'architect' | 'coder', sourcePath: string): { ok: boolean; name: string; error?: string } {
    ensureDocsDirs();
    const resolved = path.resolve(sourcePath);
    if (!fs.existsSync(resolved)) {
        return { ok: false, name: '', error: `file not found: ${resolved}` };
    }
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) {
        return { ok: false, name: '', error: `path is not a file: ${resolved}` };
    }
    const name = path.basename(resolved);
    const dest = path.join(agentDir(agent), name);
    fs.copyFileSync(resolved, dest);
    return { ok: true, name };
}

export function removeDoc(agent: 'architect' | 'coder', name: string): boolean {
    const target = path.join(agentDir(agent), name);
    if (!fs.existsSync(target)) return false;
    fs.unlinkSync(target);
    return true;
}

export function loadDocsContext(agent: 'architect' | 'coder'): string {
    const docs = listDocs(agent);
    if (docs.length === 0) return '';
    const userDocs: string[] = [];
    for (const doc of docs) {
        try {
            const content = fs.readFileSync(doc.fullPath, 'utf-8');
            const entry = `### ${doc.name}\n${content.trim()}`;
            if (!doc.name.startsWith('_')) {
                userDocs.push(entry);
            }
        } catch { /* skip */ }
    }
    const sections: string[] = [];
    if (userDocs.length > 0) {
        sections.push(`\n${'='.repeat(60)}\n` +
            `PROJECT ARCHITECTURE AND REQUIREMENTS — FOLLOW RIGOROUSLY:\n` +
            `${'='.repeat(60)}\n` +
            userDocs.join('\n\n') +
            `\n${'='.repeat(60)}`);
    }
    return sections.join('\n');
}
