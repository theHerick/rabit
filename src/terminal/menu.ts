/**
 * Main menu and sub-menus.
 * Uses inquirer list prompts. No emojis.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { SESSIONS_DIR } from '../tools/paths';

export type MainChoice =
  | 'new-session'
  | 'open-project'
  | 'settings'
  | 'exit'
  | 'mcp-link'
  | 'buy-license';

export type SettingsChoice = 'agents-config' | 'clear-history' | 'reset-brain' | 'back';
export type SkillChoice = 'list' | 'delete' | 'back';

export async function mainMenu(): Promise<MainChoice> {
  const { choice } = await inquirer.prompt<{ choice: MainChoice }>([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('Select an option:'),
      prefix: '>',
      choices: [
        { name: '[ Chat / New Project ]', value: 'new-session' },
        { name: '[ Open Existing Project ]', value: 'open-project' },
        { name: '[ Link Unified Memory (MCP) ]', value: 'mcp-link' },
        { name: '[ Settings ]', value: 'settings' },
        new inquirer.Separator(),
        { name: '[ Exit ]', value: 'exit' },
        { name: chalk.yellow('[ Buy License ]'), value: 'buy-license' }
      ]
    }
  ]);
  return choice;
}

export async function settingsMenu(): Promise<SettingsChoice> {
  const { choice } = await inquirer.prompt<{ choice: SettingsChoice }>([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('Settings:'),
      prefix: '>',
      choices: [
        { name: '[ Manage Agents ]', value: 'agents-config' },
        { name: '[ Clear History ]', value: 'clear-history' },
        { name: '[ Reset Memory (/brain) ]', value: 'reset-brain' },
        new inquirer.Separator(),
        { name: '[ Back ]', value: 'back' }
      ]
    }
  ]);
  return choice;
}

export async function skillMenu(): Promise<SkillChoice> {
  const { choice } = await inquirer.prompt<{ choice: SkillChoice }>([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('Skill Forge:'),
      prefix: '>',
      choices: [
        { name: '[ List Skills ]', value: 'list' },
        { name: '[ Delete Skill ]', value: 'delete' },
        new inquirer.Separator(),
        { name: '[ Back ]', value: 'back' }
      ]
    }
  ]);
  return choice;
}

export async function confirmAction(message: string): Promise<boolean> {
  const { yes } = await inquirer.prompt<{ yes: boolean }>([
    { type: 'confirm', name: 'yes', message, default: false }
  ]);
  return yes;
}
