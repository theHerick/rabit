#!/usr/bin/env node
/**
 * Ra-Bit Core - main entrypoint.
 * Runs the pre-flight check, mounts the global exception traps, and hands
 * control to the main menu. Strictly no emojis in any output.
 */

import chalk from 'chalk';
import { preFlightCheck } from './setup/installer';
import { ensureDirectories } from './tools/paths';
import { installBuiltinDocs } from './tools/builtinDocs';
import { printBanner, printSplash, freshScreen, freshScreenWithBanner } from './terminal/display';
import {
  mainMenu,
  settingsMenu,
  confirmAction
} from './terminal/menu';
import {
  agentConfigMenu,
  listAgentsView,
  editAgent,
  confirmResetDefaults,
  selectCoderCount,
  applyClaudeCliPreset,
  handleSavePreset,
  handleLoadPreset
} from './terminal/agentsConfig';
import { openProject } from './tools/projectSession';
import { runNewPipeline } from './core/newPipeline';
import { runInteractiveSession } from './core/loop';
import { wipeMemory } from './db/memory';
import { showLicenseDialog } from './terminal/license';
import { resetConfig } from './config/agents';
import { loadAnthropicKeyFromFile, setupAnthropicKey } from './setup/anthropicKey';

function installExceptionTraps(): void {
  process.on('uncaughtException', (err) => {
    console.error(chalk.red('\n[ uncaughtException ] ') + (err.stack || err.message));
  });
  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.stack || reason.message : String(reason);
    console.error(chalk.red('\n[ unhandledRejection ] ') + msg);
  });
  process.on('SIGINT', () => {
    console.log('\n' + chalk.gray('Terminated by user.'));
    process.exit(130);
  });
}

async function pressEnter(): Promise<void> {
  const inquirer = (await import('inquirer')).default;
  await inquirer.prompt<{ _ack: string }>([
    { type: 'input', name: '_ack', message: chalk.gray('ENTER to return'), prefix: '' }
  ]);
}

async function handleAgentConfig(): Promise<void> {
  while (true) {
    freshScreen();
    const choice = await agentConfigMenu();
    if (choice === 'back') return;
    
    if (choice === 'list-agents') {
      freshScreen();
      await listAgentsView();
      await pressEnter();
    } else if (choice === 'edit-agent') {
      freshScreen();
      await editAgent();
      await pressEnter();
    } else if (choice === 'coder-count') {
      freshScreen();
      await selectCoderCount();
      await pressEnter();
    } else if (choice === 'use-claude-cli') {
      freshScreen();
      await applyClaudeCliPreset();
      await pressEnter();
    } else if (choice === 'reset-defaults') {
      const confirm = await confirmResetDefaults();
      if (!confirm) continue;
      resetConfig();
      console.log(chalk.green('[ OK ] ') + 'Default configuration restored.\n');
      await pressEnter();
    } else if (choice === 'save-preset') {
      freshScreen();
      await handleSavePreset();
      await pressEnter();
    } else if (choice === 'load-preset') {
      freshScreen();
      await handleLoadPreset();
      await pressEnter();
    }
  }
}

async function handleSettings(): Promise<void> {
  while (true) {
    freshScreen();
    const choice = await settingsMenu();
    if (choice === 'back') return;
    if (choice === 'agents-config') {
      await handleAgentConfig();
    } else if (choice === 'clear-history') {
      console.log(chalk.gray('History cleared.'));
      await pressEnter();
    } else if (choice === 'reset-brain') {
      const confirm = await confirmAction('Reset vector memory (/brain)?');
      if (!confirm) continue;
      await wipeMemory();
      console.log(chalk.green('[ OK ] ') + 'Memory wiped.\n');
      await pressEnter();
    }
  }
}

async function main(): Promise<void> {
  installExceptionTraps();
  ensureDirectories();
  loadAnthropicKeyFromFile();
  installBuiltinDocs();

  printSplash();

  await preFlightCheck();

  await pressEnter();

  while (true) {
    freshScreen();
    const choice = await mainMenu();
    if (choice === 'exit') {
      console.log(chalk.gray('See you later.'));
      process.exit(0);
    }
    if (choice === 'new-session') {
      await runInteractiveSession();
    } else if (choice === 'open-project') {
      const project = await openProject();
      if (project) {
        await runNewPipeline(project);
      }
    } else if (choice === 'settings') {
      await handleSettings();
    } else if (choice === 'buy-license') {
      freshScreen();
      await showLicenseDialog();
    }
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.stack || err.message : String(err);
  console.error(chalk.red('\n[ fatal ] ') + msg);
  process.exit(1);
});
