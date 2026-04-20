/**
 * Minimal Context Coder
 * Receives ONLY: their files + architecture (read-only)
 * Implements as per spec
 */

import * as fs from 'fs';
import * as path from 'path';
import { completeFor } from '../providers';
import { getBinding } from '../config/agents';
import { say } from '../terminal/voices';
import type { CoderType } from '../tools/promptAdaptation';
import { isClaudeCoder, getCoderSystemPrompt, getCoderTaskPrompt } from '../tools/promptAdaptation';
import { remember } from '../db/memory';

export interface CoderResult {
  ok: boolean;
  coderId: number;
  files: Record<string, string>; // path → content
  error?: string;
}

/**
 * Coder with minimal context
 */
export async function codeWithMinimalContext(
  coderId: number,
  coderType: CoderType,
  files: string[],
  architecture: string,
  projectPath: string
): Promise<CoderResult> {
  say('coder', `Coder ${coderId}: implementing ${files.length} file(s) [${coderType}]...`);

  try {
    const fileList = files.join('\n');
    const coderBinding = getBinding(coderType);
    const isClaudeType = isClaudeCoder(coderType);

    // Generate appropriate system and task prompts based on coder type
    const systemPrompt = getCoderSystemPrompt(coderType);
    const taskPrompt = getCoderTaskPrompt(fileList, architecture, coderType);

    say('coder', `Coder ${coderId}: ${coderBinding.provider}/${coderBinding.model}`);

    const raw = await completeFor(coderBinding, {
      system: systemPrompt,
      prompt: taskPrompt,
      temperature: isClaudeType ? 0.2 : 0.3,
      format: 'json',
      numCtx: isClaudeType ? 6144 : 8192,
      effort: isClaudeType ? 'medium' : 'high',
      useMemory: true,
      projectId: path.basename(projectPath)
    });

    // Parse response
    const parsed = parseCoderResponse(raw);

    // Log observation
    await remember({
      category: 'observation',
      content: `Coder ${coderId} (${coderType}) implemented ${Object.keys(parsed.files).length} files: ${Object.keys(parsed.files).join(', ')}`,
      metadata: { projectId: path.basename(projectPath), coderId, files: Object.keys(parsed.files) }
    });

    // Save files
    for (const [filePath, content] of Object.entries(parsed.files)) {
      const fullPath = path.join(projectPath, filePath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content as string, 'utf-8');
    }

    say('coder', `Coder ${coderId}: ✓ ${Object.keys(parsed.files).length} file(s)`);

    return {
      ok: true,
      coderId,
      files: parsed.files
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    say('coder', `Coder ${coderId}: ✗ ${msg}`);
    return {
      ok: false,
      coderId,
      files: {},
      error: msg
    };
  }
}

/**
 * Parse coder response
 */
function parseCoderResponse(raw: string): { files: Record<string, string> } {
  try {
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    
    if (first < 0 || last < 0) {
      throw new Error('JSON not found in response');
    }

    const json = raw.substring(first, last + 1);
    const parsed = JSON.parse(json) as { files?: unknown };

    if (!parsed.files || typeof parsed.files !== 'object') {
      throw new Error('Field "files" not found or invalid');
    }

    const files: Record<string, string> = {};
    for (const [path, content] of Object.entries(parsed.files)) {
      if (typeof content === 'string') {
        files[path] = content;
      }
    }

    if (Object.keys(files).length === 0) {
      throw new Error('No files were generated');
    }

    return { files };
  } catch (err) {
    throw new Error(`Error parsing coder response: ${err}`);
  }
}
