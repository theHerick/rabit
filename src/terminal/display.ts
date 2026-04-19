/**
 * Dynamic display.
 * Renders the fixed banner and drives the animated status line via log-update.
 * No emojis are used anywhere in the rendered output.
 */

import chalk from 'chalk';
import logUpdate from 'log-update';
import { prettyCwd } from '../tools/paths';

// ExecutionMode removed

const LOGO_LINES: ReadonlyArray<string> = [
  '██████╗  █████╗ ██████╗ ██╗████████╗',
  '██╔══██╗██╔══██║██╔══██║██║╚══██╔══╝',
  '██████╔╝███████║██████╔╝██║   ██║   ',
  '██╔══██╗██╔══██║██╔══██║██║   ██║   ',
  '██║  ██║██║  ██║██████╔╝██║   ██║   ',
  '╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝   ╚═╝   ',
  '',
  ' ██████╗ ██████╗ ██████╗ ███████╗',
  '██╔════╝██╔═══██║██╔══██║██╔════╝',
  '██║     ██║   ██║██║  ██║█████╗  ',
  '██║     ██║   ██║██║  ██║██╔══╝  ',
  '╚██████╗╚██████╔╝██████╔╝███████╗',
  ' ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝'
];

const PET_LINES: ReadonlyArray<string> = [
  '█    █    ',
  ' ▐▛███▜▌  ',
  '▝▜██ ██▛▘',
  '  ██████  '
];

export interface DisplayState {
  statusText: string;
  hint?: string;
}

let intervalHandle: NodeJS.Timeout | null = null;
let frame = 0;
let currentState: DisplayState = { statusText: 'Waiting' };
let running = false;

function statusDots(i: number): string {
  const cycle = ['.', '..', '...'];
  return cycle[i % cycle.length];
}

function getSystemColor(): typeof chalk.blue {
  return chalk.cyan;
}

function renderSimpleSessionBanner(state: DisplayState): string {
  const status = chalk.yellow(state.statusText + statusDots(frame));
  const cwd = chalk.green(prettyCwd());
  const hintLine = state.hint ? chalk.gray(state.hint) : '';
  
  const lines: string[] = [];
  lines.push(chalk.bold.blue('Ra-Bit'));
  lines.push('');
  lines.push(' ' + getSystemColor()(PET_LINES[0]));
  lines.push(getSystemColor()(PET_LINES[1]) + ' < ' + status);
  lines.push(getSystemColor()(PET_LINES[2]) + ' ' + cwd);
  lines.push(getSystemColor()(PET_LINES[3]));
  
  return lines.join('\n');
}

function renderBanner(state: DisplayState): string {
  const status = chalk.yellow(state.statusText + statusDots(frame));
  const cwd = chalk.green(prettyCwd());
  const hintLine = state.hint ? chalk.gray(state.hint) : '';
  
  const lines: string[] = [];
  
  // Logo ASCII art
  lines.push(chalk.cyan(LOGO_LINES[0]));
  lines.push(chalk.cyan(LOGO_LINES[1]));
  lines.push(chalk.cyan(LOGO_LINES[2]));
  lines.push(chalk.cyan(LOGO_LINES[3]));
  lines.push(chalk.cyan(LOGO_LINES[4]));
  lines.push(chalk.cyan(LOGO_LINES[5]));
  lines.push(chalk.cyan(LOGO_LINES[6])); // empty line
  lines.push(chalk.cyan(LOGO_LINES[7]));
  lines.push(chalk.cyan(LOGO_LINES[8]));
  lines.push(chalk.cyan(LOGO_LINES[9]));
  lines.push(chalk.cyan(LOGO_LINES[10]));
  lines.push(chalk.cyan(LOGO_LINES[11]));
  lines.push(chalk.cyan(LOGO_LINES[12]));
  
  // Status and hint
  lines.push('');
  lines.push('< ' + status);
  lines.push(cwd);
  lines.push(hintLine);
  
  return lines.join('\n');
}

export function renderStaticBanner(): string {
  const state: DisplayState = { statusText: 'Ready' };
  frame = 0;
  return renderBanner(state);
}

export function startStatus(initial: string): void {
  currentState = { statusText: initial };
  frame = 0;
  running = true;
  logUpdate.clear();
  logUpdate(renderBanner(currentState));
  intervalHandle = setInterval(() => {
    if (!running) return;
    frame = (frame + 1) % 60;
    logUpdate(renderSimpleSessionBanner(currentState));
  }, 350);
  if (intervalHandle.unref) intervalHandle.unref();
}

export function updateStatus(text: string, hint?: string): void {
  currentState = { statusText: text, hint };
  if (running) {
    frame = 0;
    logUpdate(renderSimpleSessionBanner(currentState));
  }
}

export function stopStatus(finalText?: string): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  running = false;
  if (finalText) {
    currentState = { statusText: finalText };
    logUpdate(renderSimpleSessionBanner(currentState));
  }
  logUpdate.done();
}

export function clearDisplay(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  running = false;
  logUpdate.done();
  // ANSI clear + scrollback wipe; falls back gracefully on dumb terminals.
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
}

export function printBanner(): void {
  console.log(renderStaticBanner());
  console.log();
}

export function printSimpleBanner(): void {
  console.log(chalk.bold.blue('Ra-Bit'));
  console.log('');
  console.log(' ' + chalk.cyan(PET_LINES[0]));
  console.log(chalk.cyan(PET_LINES[1]));
  console.log(chalk.cyan(PET_LINES[2]));
  console.log(chalk.cyan(PET_LINES[3]));
  console.log();
}

/**
 * Full-screen reset: wipes the terminal and renders a fresh banner.
 * Use before every major navigation transition (menu, session, dialog)
 * so the screen never accumulates repeated bonequinhos.
 */
export function freshScreen(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  running = false;
  logUpdate.done();
  // ANSI clear + scrollback wipe; falls back gracefully on dumb terminals.
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
  printSimpleBanner();
}

export function clearSessionScreen(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  running = false;
  logUpdate.done();
  // ANSI clear + scrollback wipe; falls back gracefully on dumb terminals.
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
  printSimpleBanner();
}

// Additional function to render full logo (startup only)
export function freshScreenWithBanner(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  running = false;
  logUpdate.done();
  // ANSI clear + scrollback wipe; falls back gracefully on dumb terminals.
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
  printBanner();
}

export const LOGO = LOGO_LINES;

// ─── startup splash ────────────────────────────────────────────────

const RABBIT_ART: ReadonlyArray<string> = [
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣴⣶⡶⣶⣤⡀⠀⠀⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣴⠶⢾⣟⣻⣟⣻⡛⠾⢿⠛⠛⠛⠒⠂⠉⣻⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⡏⠦⢘⢿⣿⣿⣿⣿⡿⠄⣈⢲⠀⠀⠀⢀⠀⠀⢿⣆⠀⠈⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⢯⡆⠤⠀⠀⠉⠡⠆⠀⡢⢋⠜⠀⠀⠁⠀⢀⠂⠈⣿⡄⠀⠈⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⡧⡇⠀⠀⣀⠤⠔⢂⠡⠄⠈⠀⠀⠐⠀⠌⡲⢄⠠⣘⣷⡄⠀⠈⠂⠀⠀⠀⠀⠀⣀⣠⣀⠀⠀⢡⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠤⠀⠂⠀⠀⣿⡗⡇⡂⠭⠐⠂⠉⠀⢶⡄⣈⣴⣾⣶⡶⠞⠃⠈⠉⣽⣿⣿⣄⣀⣠⣤⣴⣶⣾⣿⢟⡟⣿⡇⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠔⠈⠀⠀⠀⣀⣀⣤⣤⣿⣿⣽⣤⣤⣤⡦⠶⠛⠈⢉⠝⣿⣿⢿⣿⣿⠆⣠⣌⠹⣿⣿⣿⣿⣛⣛⣯⣭⣥⠈⠙⢾⣿⠃⠀⢠⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠄⠀⠀⣀⣴⠾⣛⢫⠭⣉⠳⡐⢆⡚⡍⠭⢭⢛⣛⠶⠾⣿⣮⣿⣯⣾⣿⣿⣾⡿⠿⠟⠛⠛⠉⣉⣉⣤⡴⠞⣋⣤⣾⠟⠁⠀⢀⠂⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠄⠀⠀⣴⢟⡵⣉⠖⣡⠞⡰⢣⡙⠦⡱⢌⡙⢆⠣⢆⡹⢔⡢⣝⢻⡿⢿⠿⡿⠿⡷⢿⠾⣟⢻⠻⣍⣳⣼⣾⣿⡿⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠸⣿⣸⡴⢡⢚⠤⣋⡔⢣⣜⣡⣳⣮⣽⣾⣿⣾⣶⣿⣶⣷⣿⡿⠾⠾⣷⣿⣬⣷⣿⣶⣿⣿⣿⣿⠟⠉⠙⣿⢦⡀⠀⠠⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠈⠻⠷⣷⣾⣷⣶⠿⠿⠿⠿⢿⣿⣿⣿⣿⣿⣿⣿⡿⠋⣀⣤⡤⣤⣄⡉⢿⣿⠿⠿⠛⠛⠛⠛⠛⠓⠒⠾⣶⡇⠀⠀⠁⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠢⢀⡀⠀⠀⠀⠀⠀⣀⣤⣶⣾⢿⣿⣿⡿⠛⣉⣭⡟⢠⣾⣁⡤⢴⣶⣶⡝⢦⠹⠀⠀⠀⠀⠶⠶⠀⠀⠀⠀⠈⠛⢷⣄⠀⠀⠡⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⠁⠀⢀⣤⡶⠟⢋⡭⠞⣡⠞⣡⠏⢠⡾⠉⣼⡃⣿⣿⣿⣧⣴⣿⣿⣷⢸⠀⣠⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⣧⠀⠀⡆⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⠟⣡⠀⠀⠉⠀⠞⠁⠐⠃⠀⣾⢀⣆⢿⣇⣟⠻⣿⣿⣿⣿⡿⢃⠎⠰⠃⠀⠀⠀⠀⠀⢀⣠⣤⣶⣴⡶⠶⣼⡟⠀⠀⡇⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⠶⠛⠁⠸⠏⢠⠇⠀⠀⠀⠀⠀⠀⢠⡇⢸⡿⠘⣿⢮⣳⢬⣭⣭⠭⠗⠉⠀⠀⠀⠀⣀⣤⡶⠾⠛⠉⠁⠀⠀⠀⢠⡿⠁⠀⠠⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⠀⠀⠀⣀⣴⠞⠋⠀⠀⠀⣴⠟⢠⠏⠀⠀⠀⠀⠀⠀⠀⡾⢠⠏⠀⠀⠈⠉⠀⠀⠀⠀⠀⠀⢀⣠⣤⠶⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⣰⡟⠁⠀⠠⠁⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⠊⠀⠀⣠⡾⠋⢠⣴⠞⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡟⢠⠄⠀⠀⠀⠀⢀⣀⣤⠴⠞⠋⠉⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣶⡾⠋⠀⠀⡐⠁⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠔⠀⠀⣠⡾⠋⡀⠀⠉⣵⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⣇⠘⠦⠤⠴⠶⠛⠋⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣖⡿⣿⠟⠀⠀⠀⠊⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠂⠀⠀⣴⢟⡀⠞⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣄⣀⠀⠻⣦⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠶⠛⠀⣼⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⠣⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣏⢞⣶⣦⣀⠙⠛⠶⠶⠂⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣽⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣴⣞⣫⣿⠿⢁⠈⠈⠙⠛⠛⠲⠶⠶⠶⠶⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⠀⠀⣸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣴⠿⠛⠉⢁⣠⠴⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⢞⡿⢃⢸⡗⠀⠐⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⣀⠀⠀⠀⣿⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⠞⠋⠁⠀⣀⡴⠞⠋⠁⠀⠀⠀⠀⠀⣀⡀⣀⣤⢴⢶⣚⣿⠿⠖⠀⠀⠀⠀⠀⢚⣵⣿⢧⠛⠹⣧⠀⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠄⠀⠁⠀⠀⢀⣾⣿⣉⣉⡙⠻⢦⣄⠀⠀⠀⠀⠀⢰⡟⠁⠀⠀⠘⠶⣭⡀⠀⠀⠀⢀⣠⣴⣶⡿⠿⡝⠳⠾⠛⠋⠁⠀⠀⠀⠀⠀⠀⠀⢠⡿⢹⣿⡛⠀⠀⢻⡆⠀⢠⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⡐⠀⠀⣠⡴⠶⠛⠛⠁⠀⠀⠉⠻⣦⡀⠻⣷⡀⠀⠀⠀⠸⣧⠀⠀⠀⠀⠀⠀⢿⣤⣴⡿⣟⡿⠙⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⡿⠁⠘⣿⡇⠀⠀⢹⡷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⢰⣏⣤⣤⣤⣀⡀⠀⠀⠀⠀⠈⠁⠀⢿⣿⡀⠀⠀⠀⢻⡆⠀⠀⠀⠀⠀⠈⣿⣧⠛⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣟⣀⣀⣤⣿⡇⠀⠀⢠⣿⠀⠀⡄⠀⠀⠀⠀⠀⠀⠀',
  '⠠⠀⠀⣠⡶⠟⠛⠛⠛⠛⠛⠛⠓⠂⠀⠀⠀⠀⠀⣿⣯⠇⠀⠀⠀⠈⢿⡄⠀⠀⠀⠀⠀⠸⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣷⠀⠀⢠⣿⠀⠀⢇⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⢀⣿⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⡝⢀⠀⠀⠀⠀⠘⣿⡄⠀⠀⠀⠀⠀⢻⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣶⣿⣿⣯⣟⣿⣿⣿⣛⣉⠉⠁⢠⣤⣿⣀⠀⠀⠀⠂⠄⢀⡀⠀⠀',
  '⢀⠀⠀⢻⣎⠳⢶⣤⣄⣀⣀⣀⣀⣀⣤⣴⣾⣿⣿⡟⠀⠈⣧⠀⠀⠀⠀⠘⣿⡄⠀⠀⠀⠀⠀⢿⡄⠀⠀⠀⠀⠀⣀⣠⣤⣶⣿⣿⣿⣿⣿⠟⣿⠟⠛⠛⢛⣉⣉⣠⠀⠀⠉⠙⠛⠷⣦⣄⣀⠀⠀⠈⠀⡀',
  '⠀⠀⠀⠀⠙⢷⣄⡈⠻⣟⠛⠿⢿⣿⣿⣿⣿⣿⡟⠀⠷⣄⣠⣸⣦⣤⣄⠀⠀⠈⢿⣆⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣿⣿⡿⠿⠛⠛⠉⠁⠀⠈⠻⣶⠾⠟⠛⢿⣿⡟⢀⣄⠀⢳⣶⣤⣄⣉⠉⠻⣦⠀⠀⠁',
  '⠀⠀⠀⠀⠀⠀⠙⠻⣦⣝⣶⣦⣤⣌⣙⡛⠿⣿⣿⣶⣤⣤⣾⠿⠟⠻⠛⠛⠛⠞⠿⣦⡀⠀⠀⠀⠀⠈⠉⡙⠛⠛⠛⠛⠻⠟⠻⠟⠶⢾⣦⣤⣤⡀⠀⠀⠀⣿⣉⣠⡿⠻⣷⡈⢿⡍⠙⠛⠻⠟⠋⠀⠀⠄',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠈⣿⣀⣽⠟⠛⠛⠻⢷⣄⣤⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⢷⣦⣄⣀⠀⠀⠻⢦⡘⢿⣟⣻⡿⠿⠿⠟⠿⢶⣤⡾⠃⠀⠀⠀⠈⠉⠉⠀⠀⠘⠛⠛⠁⠀⠀⠀⠀⠀⠄⠊⠀',
  '⠀⠀⠀⠀⠀⠀⠈⠀⠀⠈⠉⠁⠀⠀⢀⠀⠀⠉⠉⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠛⠻⠷⣶⣄⠙⢷⣄⠉⣻⡆⠀⠀⠀⠀⠀⠀⠀⠀⠈⠐⠀⠀⠀⠐⠂⠤⠄⠠⠤⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠒⠒⠒⠂⠁⠀⠁⠐⠒⠂⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠀⠂⠠⠀⡀⠀⠈⠛⠿⠛⠙⠛⠋⠁⠀⡸⠈⠉⠉⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠂⠄⠀⠀⠀⠀⠀⠀⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
];

export function printSplash(): void {
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
  console.log('');

  for (const line of RABBIT_ART) {
    console.log(chalk.cyan(line));
  }

  console.log('');
  console.log(chalk.bold.cyan('  ██████╗  █████╗ ██████╗ ██╗████████╗'));
  console.log(chalk.cyan('  ██╔══██╗██╔══██║██╔══██║██║╚══██╔══╝'));
  console.log(chalk.cyan('  ██████╔╝███████║██████╔╝██║   ██║   '));
  console.log(chalk.cyan('  ██╔══██╗██╔══██║██╔══██║██║   ██║   '));
  console.log(chalk.cyan('  ██║  ██║██║  ██║██████╔╝██║   ██║   '));
  console.log(chalk.cyan('  ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝   ╚═╝   '));
  console.log('');
  console.log(chalk.gray('  Multi-Agent AI Code Generator'));
  console.log('');
}
