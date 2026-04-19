/**
 * License dialog.
 * A soft-sell screen triggered from the main menu. The banner character
 * "speaks" a reassuring line and the PIX key appears below.
 *
 * EDIT PIX_KEY below (or export CLLAMA_PIX_KEY in your shell) to set the
 * key that will be shown to the user.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

export const PIX_KEY = process.env.CLLAMA_PIX_KEY || 'YOUR-PIX-KEY-HERE';
export const PIX_OWNER = process.env.CLLAMA_PIX_OWNER || '';

const SPEECH: ReadonlyArray<string> = [
  'Sure, only if you want to buy!',
  'If you dont want to, nothing changes,',
  'it will still work normally.'
];

const CHARACTER: ReadonlyArray<string> = [
  '  \u2588    \u2588    ',
  ' \u2590\u259b\u2588\u2588\u2588\u259c\u258c    ',
  '\u259d\u259c\u2588\u2588 \u2588\u2588\u259b\u2598  ',
  '  \u2588\u2588\u2588\u2588\u2588\u2588     '
];

function padRight(s: string, width: number): string {
  if (s.length >= width) return s;
  return s + ' '.repeat(width - s.length);
}

/**
 * Render the character speaking next to a speech bubble.
 * The bubble has one line per SPEECH entry and is anchored to the middle
 * row of the character so the pointer reads naturally.
 */
function renderSpeaking(): string {
  const figure = CHARACTER.map((l) => chalk.blue(l));
  const rows = Math.max(figure.length, SPEECH.length);
  const out: string[] = [];
  for (let i = 0; i < rows; i++) {
    const left = i < figure.length ? figure[i] : padRight('', CHARACTER[0].length);
    const line = i < SPEECH.length ? SPEECH[i] : '';
    if (line.length === 0) {
      out.push(left);
    } else {
      out.push(left + chalk.yellow('< ') + chalk.bold.white(line));
    }
  }
  return out.join('\n');
}

function renderPixBlock(): string {
  const label = chalk.bold.cyan('PIX');
  const key = chalk.green(PIX_KEY);
  const owner = PIX_OWNER ? chalk.gray('  (' + PIX_OWNER + ')') : '';
  const boxTop = chalk.gray('  .--------------------------------------------.');
  const boxBot = chalk.gray('  `--------------------------------------------`');
  const content = `  | ${label}: ${key}${owner}`;
  return [boxTop, content, boxBot].join('\n');
}

/**
 * Full license screen. Blocks until the user presses ENTER to return.
 */
export async function showLicenseDialog(): Promise<void> {
  console.log();
  console.log(renderSpeaking());
  console.log();
  console.log(renderPixBlock());
  console.log();
  if (PIX_KEY === 'YOUR-PIX-KEY-HERE') {
    console.log(
      chalk.gray(
        '  (placeholder - edit src/terminal/license.ts or export CLLAMA_PIX_KEY=...)'
      )
    );
    console.log();
  }
  await inquirer.prompt<{ _ack: string }>([
    {
      type: 'input',
      name: '_ack',
      message: chalk.gray('press ENTER to return'),
      prefix: ''
    }
  ]);
}
