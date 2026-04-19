/**
 * Pre-Flight Check — optional.
 * Checks for Claude CLI and Ollama. Does not fail boot if neither is available.
 * If Ollama is accessible but missing models, offers installation.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import logUpdate from 'log-update';
import { listModels, pullModel, REQUIRED_MODELS, OLLAMA_HOST } from '../tools/ollama';
import { openclaudeAvailable } from '../tools/openclaude';

export interface PreFlightResult {
  ok: boolean;
  missing: string[];
  installed: string[];
  claudeCliAvailable: boolean;
  ollamaAvailable: boolean;
}

// Approximate sizes in GB per model
const MODEL_SIZES: Record<string, number> = {
  'qwen3.6':           4.5,
  'qwen3.6:latest':    4.5,
  'llama3':            4.7,
  'llama3:latest':     4.7,
  'llama3.1:8b':       4.7,
  'deepseek-coder-v2': 8.9,
  'deepseek-coder-v2:latest': 8.9,
  'qwen3.5':           2.3,
  'qwen3.5:latest':    2.3,
  'qwen2.5-coder:7b':  4.4,
  'nomic-embed-text':  0.3,
};

function modelSize(name: string): number {
  return MODEL_SIZES[name] ?? MODEL_SIZES[name.split(':')[0]] ?? 2.0;
}

function totalSize(models: string[]): string {
  const gb = models.reduce((sum, m) => sum + modelSize(m), 0);
  return gb.toFixed(1) + ' GB';
}

function normalise(name: string): string {
  return name.trim().toLowerCase();
}

function isPresent(required: string, installed: string[]): boolean {
  const target = normalise(required);
  return installed.some((name) => {
    const n = normalise(name);
    return n === target || n.startsWith(target + ':') || target.startsWith(n + ':');
  });
}

export async function preFlightCheck(): Promise<PreFlightResult> {
  // ── 1. Claude CLI ────────────────────────────────────────────────────────
  const claudeCliAvailable = await openclaudeAvailable();

  if (claudeCliAvailable) {
    console.log(chalk.green('  [ claude ] ') + 'binary available in PATH.');
  } else {
    console.log(chalk.yellow('  [ claude ] ') + 'binary not found — ' +
      chalk.gray('install Claude Code to use the CLI preset.'));
  }

  // ── 2. Ollama (optional) ─────────────────────────────────────────────────
  let installed: string[] = [];
  let ollamaAvailable = false;

  try {
    installed = await listModels();
    ollamaAvailable = true;
  } catch {
    // Ollama not running — optional
    if (!claudeCliAvailable) {
      console.log(chalk.yellow('  [ ollama ] ') + 'daemon not found at ' + OLLAMA_HOST);
      console.log(chalk.gray('             No provider available. Configure one before using.'));
    }
    return { ok: claudeCliAvailable, missing: [...REQUIRED_MODELS], installed: [], claudeCliAvailable, ollamaAvailable: false };
  }

  const missing = REQUIRED_MODELS.filter((m) => !isPresent(m, installed));

  if (missing.length === 0) {
    console.log(chalk.green('  [ ollama ] ') + 'all local models available.');
    return { ok: true, missing: [], installed, claudeCliAvailable, ollamaAvailable };
  }

  // Models missing — offer installation
  const size = totalSize(missing);
  console.log(chalk.gray('  [ ollama ] ') + `${missing.length} local model(s) not installed.`);
  console.log('');
  console.log(chalk.bold.cyan('  Local AI Package (Ollama)'));
  console.log(chalk.gray('  ────────────────────────────────────'));
  for (const m of missing) {
    console.log(chalk.gray('    ' + m.padEnd(26) + '~' + modelSize(m).toFixed(1) + ' GB'));
  }
  console.log(chalk.gray('  ────────────────────────────────────'));
  console.log(chalk.gray('  Total: ') + chalk.yellow(size));
  console.log('');

  if (claudeCliAvailable) {
    // Claude CLI available — installation is optional
    const { install } = await inquirer.prompt<{ install: boolean }>([{
      type: 'confirm',
      name: 'install',
      message: `Install local AI package? (~${size})`,
      default: false,
      prefix: chalk.cyan('  ?')
    }]);

    if (!install) {
      console.log(chalk.gray('  Using Claude CLI as primary provider.\n'));
      return { ok: true, missing, installed, claudeCliAvailable, ollamaAvailable };
    }
  } else {
    // No Claude CLI — installation is required to work
    const { install } = await inquirer.prompt<{ install: boolean }>([{
      type: 'confirm',
      name: 'install',
      message: `Install local AI package? (~${size}) [required to work]`,
      default: true,
      prefix: chalk.cyan('  ?')
    }]);

    if (!install) {
      console.log(chalk.yellow('  [ Warning ] ') + 'No provider configured. The system may not work.\n');
      return { ok: false, missing, installed, claudeCliAvailable, ollamaAvailable };
    }
  }

  // Install missing models
  console.log('');
  for (const model of missing) {
    await pullWithProgress(model);
  }

  const updated = await listModels();
  const stillMissing = REQUIRED_MODELS.filter((m) => !isPresent(m, updated));

  if (stillMissing.length > 0) {
    console.log(chalk.red('\n  [ Error ] ') + 'Could not install: ' + stillMissing.join(', '));
    return { ok: claudeCliAvailable, missing: stillMissing, installed: updated, claudeCliAvailable, ollamaAvailable };
  }

  console.log(chalk.green('\n  [ OK ] ') + 'Local AI package installed.\n');
  return { ok: true, missing: [], installed: updated, claudeCliAvailable, ollamaAvailable };
}

async function pullWithProgress(model: string): Promise<void> {
  console.log(chalk.cyan('  [ installing ] ') + model);
  try {
    await pullModel(model, (status, completed, total) => {
      if (typeof completed === 'number' && typeof total === 'number' && total > 0) {
        const pct = ((completed / total) * 100).toFixed(1);
        const bar = renderBar(completed / total, 28);
        logUpdate('  ' + chalk.blue(bar) + '  ' + pct + '%  ' + chalk.gray(status));
      } else {
        logUpdate('  ' + chalk.gray(status));
      }
    });
    logUpdate.done();
    console.log(chalk.green('  [ done ] ') + model);
  } catch (err) {
    logUpdate.done();
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red('  [ failed ] ') + model + ' — ' + msg);
  }
}

function renderBar(ratio: number, width: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
}
