/**
 * Agent voices.
 * Each agent type has a fixed chalk colour so its lines are instantly
 * recognisable in the transcript. Workers spawned by the Swarm rotate
 * through a palette so that multiple engineers on the same turn are
 * visually distinct from one another.
 */

import chalk from 'chalk';

type ChalkFn = (text: string) => string;

export interface VoiceStyle {
  label: string;
  color: ChalkFn;
}

export const voices = {
  architect:   { label: 'Architect',   color: chalk.cyan },
  coder:       { label: 'Coder',       color: chalk.green },
  juniorCoder: { label: 'Junior',      color: chalk.greenBright },
  seniorCoder: { label: 'Senior',      color: chalk.bold.green },
  reviewer:    { label: 'Reviewer',    color: chalk.yellow },
  organizer:   { label: 'Organizer',   color: chalk.magenta },
  deployer:    { label: 'Deployer',    color: chalk.red },
  brain:       { label: 'Brain',       color: chalk.bold.magenta },
  integrator:  { label: 'Integrator', color: chalk.bold.cyan },
  system:      { label: 'System',     color: chalk.gray }
} as const satisfies Record<string, VoiceStyle>;

export type VoiceKey = keyof typeof voices;

/**
 * Print a voice line in the canonical format:
 *   < [Label] message
 * The entire prefix is coloured; the message body stays in the default
 * terminal colour so logs and payloads remain readable.
 * 
 * During processing, intermediary logs are suppressed to keep UI clean.
 * Only final results are printed.
 */
let suppressLogs = false;

export function setSuppressLogs(suppress: boolean): void {
  suppressLogs = suppress;
}

export function say(key: VoiceKey, message: string): void {
  // Suppress intermediary logs during pipeline processing
  if (suppressLogs && key !== 'system') return;
  
  const v = voices[key];
  console.log(v.color(`< [${v.label}]`) + ' ' + message);
}

/**
 * Print with a custom label for per-instance voices (worker-1, worker-2...)
 * while keeping the colour of the chosen voice family.
 */
export function sayAs(key: VoiceKey, label: string, message: string): void {
  const v = voices[key];
  console.log(v.color(`< [${label}]`) + ' ' + message);
}

/**
 * Legend helper for the menu / help output.
 */
export function renderLegend(): string {
  const entries = (Object.entries(voices) as Array<[VoiceKey, VoiceStyle]>).map(
    ([, v]) => v.color(`< [${v.label}]`)
  );
  return entries.join('  ');
}
