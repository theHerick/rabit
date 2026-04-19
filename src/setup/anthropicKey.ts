/**
 * Anthropic API Key setup.
 * Saves the key to ~/.rabit/.env and loads it into process.env at startup.
 * Offers to open the browser to the Anthropic console so the user can
 * copy the key directly.
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { CLLAMA_ROOT } from '../tools/paths';

const ENV_FILE = path.join(CLLAMA_ROOT, '.env');
const CONSOLE_URL = 'https://console.anthropic.com/settings/keys';

export function loadAnthropicKeyFromFile(): void {
  if (process.env.ANTHROPIC_API_KEY) return;
  try {
    const content = fs.readFileSync(ENV_FILE, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('ANTHROPIC_API_KEY=')) {
        const value = trimmed.slice('ANTHROPIC_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
        if (value) {
          process.env.ANTHROPIC_API_KEY = value;
          return;
        }
      }
    }
  } catch {
    // file does not exist yet, ok
  }
}

function saveKeyToFile(key: string): void {
  let content = '';
  try {
    content = fs.readFileSync(ENV_FILE, 'utf-8');
  } catch { /* new file */ }

  const lines = content.split('\n').filter((l) => !l.trim().startsWith('ANTHROPIC_API_KEY='));
  lines.push(`ANTHROPIC_API_KEY=${key}`);
  fs.writeFileSync(ENV_FILE, lines.join('\n').trim() + '\n', { mode: 0o600 });
}

function openBrowser(url: string): void {
  const cmds = ['xdg-open', 'open', 'sensible-browser'];
  for (const cmd of cmds) {
    try {
      exec(`${cmd} "${url}" 2>/dev/null`);
      return;
    } catch { /* try next */ }
  }
}

export async function setupAnthropicKey(): Promise<boolean> {
  console.log('\n' + chalk.bold.cyan('=== Setup Anthropic Key ===\n'));
  console.log(chalk.gray('  You need an Anthropic API key to use Claude models.'));
  console.log(chalk.gray('  The key is saved in: ') + chalk.white(ENV_FILE));
  console.log(chalk.gray('  Permissions: 600 (only you can read)\n'));

  const { openBrowserChoice } = await inquirer.prompt<{ openBrowserChoice: boolean }>([
    {
      type: 'confirm',
      name: 'openBrowserChoice',
      message: `Open the Anthropic console in your browser? ${chalk.gray('(' + CONSOLE_URL + ')')}`,
      default: true
    }
  ]);

  if (openBrowserChoice) {
    openBrowser(CONSOLE_URL);
    console.log(chalk.gray('\n  Opening ' + CONSOLE_URL + ' ...'));
    console.log(chalk.gray('  Log in, go to "API Keys" and create or copy a key.\n'));
    await new Promise((r) => setTimeout(r, 1500));
  }

  const { key } = await inquirer.prompt<{ key: string }>([
    {
      type: 'password',
      name: 'key',
      message: chalk.white('Paste your API key here:'),
      prefix: chalk.cyan('  >'),
      mask: '*'
    }
  ]);

  const trimmed = key.trim();
  if (!trimmed) {
    console.log(chalk.yellow('\n  (cancelled — no key provided)\n'));
    return false;
  }

  if (!trimmed.startsWith('sk-ant-')) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow('Key does not start with "sk-ant-". Save anyway?'),
        default: false
      }
    ]);
    if (!confirm) return false;
  }

  saveKeyToFile(trimmed);
  process.env.ANTHROPIC_API_KEY = trimmed;
  console.log(chalk.green('\n  [ OK ] Key saved in ' + ENV_FILE));
  console.log(chalk.gray('  It will be automatically loaded in future sessions.\n'));
  return true;
}

export function hasAnthropicKey(): boolean {
  if (process.env.ANTHROPIC_API_KEY) return true;
  try {
    const content = fs.readFileSync(ENV_FILE, 'utf-8');
    return content.includes('ANTHROPIC_API_KEY=');
  } catch {
    return false;
  }
}
