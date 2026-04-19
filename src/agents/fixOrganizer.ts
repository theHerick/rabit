/**
 * Fix Organizer
 * If there are issues, tries to fix them
 * Fixes imports, organizes folders, etc
 */

import * as fs from 'fs';
import * as path from 'path';
import { completeFor } from '../providers';
import { getBinding } from '../config/agents';
import { say } from '../terminal/voices';

export interface OrganizerResult {
  ok: boolean;
  fixed?: string[];
  error?: string;
}

/**
 * Tries to fix incompatibilities
 */
export async function organizeAndFixProject(
  projectPath: string,
  architecture: string,
  issues: string[]
): Promise<OrganizerResult> {
  say('organizer', `analyzing ${issues.length} issue(s)...`);

  try {
    if (issues.length === 0) {
      say('organizer', 'no problems, just organizing...');
      // Just organize folders
      organizeFolders(projectPath);
      return { ok: true, fixed: [] };
    }

    // If there are issues, try to fix them
    say('organizer', 'fixing incompatibilities...');

    const fixed: string[] = [];

    for (const issue of issues) {
      const result = await fixIssue(projectPath, issue, architecture);
      if (result.ok) {
        fixed.push(issue);
        say('organizer', `✓ fixed: ${issue.substring(0, 50)}...`);
      }
    }

    // Organize folders at the end
    organizeFolders(projectPath);

    return {
      ok: fixed.length === issues.length,
      fixed
    };
  } catch (err) {
    return {
      ok: false,
      error: String(err)
    };
  }
}

/**
 * Tries to fix a specific issue
 */
async function fixIssue(
  projectPath: string,
  issue: string,
  architecture: string
): Promise<{ ok: boolean }> {
  try {
    // Extract problematic file
    const match = issue.match(/in (.+?\.tsx?)/i) || issue.match(/in (.+)/);
    if (!match) return { ok: false };

    const problemFile = match[1];
    const fullPath = path.join(projectPath, problemFile);

    if (!fs.existsSync(fullPath)) {
      return { ok: false };
    }

    const content = fs.readFileSync(fullPath, 'utf-8');

    // Minimalist prompt to fix
    const prompt = `
File: ${problemFile}
Issue: ${issue}

Current content:
\`\`\`
${content.substring(0, 1000)}
\`\`\`

Architecture:
\`\`\`
${architecture.substring(0, 500)}
\`\`\`

Fix ONLY the issue. Return JSON:
{
  "fixed": true,
  "newContent": "fixed code here"
}`;

    const raw = await completeFor(getBinding('organizer'), {
      system: 'You are a code fixer. Analyze the problem and return only JSON with the fixed code.',
      prompt,
      temperature: 0.2,
      format: 'json',
      numCtx: 6144,
      effort: 'low'
    });

    const parsed = JSON.parse(raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as {
      fixed?: boolean;
      newContent?: string;
    };

    if (parsed.fixed && parsed.newContent) {
      fs.writeFileSync(fullPath, parsed.newContent, 'utf-8');
      return { ok: true };
    }

    return { ok: false };
  } catch {
    return { ok: false };
  }
}

/**
 * Organizes folder structure
 * Moves files to appropriate locations
 */
function organizeFolders(projectPath: string): void {
  try {
    const rules: Array<[RegExp, string]> = [
      [/^src\/.+\.tsx?$/, 'src/'],
      [/^pages\/.+\.tsx?$/, 'pages/'],
      [/^components\/.+\.tsx?$/, 'components/'],
      [/^styles\/.+\.css$/, 'styles/'],
      [/^tests\/.+\.test\.ts$/, 'tests/'],
      [/^(README|package)/, './'],
    ];

    const allFiles = getAllFiles(projectPath);

    for (const file of allFiles) {
      const rel = path.relative(projectPath, file);

      for (const [pattern, targetDir] of rules) {
        if (pattern.test(rel)) {
          const targetPath = path.join(projectPath, targetDir, path.basename(file));

          if (file !== targetPath && fs.existsSync(file)) {
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }

            fs.renameSync(file, targetPath);
          }
          break;
        }
      }
    }

    say('organizer', 'files organized');
  } catch (err) {
    say('organizer', `warning while organizing: ${err}`);
  }
}

/**
 * Lists all files recursively
 */
function getAllFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignore
  }

  return files;
}
