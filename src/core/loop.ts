/**
 * Interactive session loop.
 * Reads user input, handles reserved commands (/brain, /exit, /help),
 * and dispatches real work to the pipeline.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { startStatus, stopStatus, printBanner, printSimpleBanner, clearDisplay, freshScreen, clearSessionScreen } from '../terminal/display';
import { renderBrain, wipeMemory, listAll } from '../db/memory';
import * as Session from './session';
import { SessionData, SessionMessage } from '../tools/types';
import { say, renderLegend } from '../terminal/voices';
import { SESSIONS_DIR } from '../tools/paths';
import { listDocs, addDoc, removeDoc, DocAgent, ARCHITECT_DOCS_DIR, CODER_DOCS_DIR } from '../tools/docs';
// tokenStats removed;
import { openArchitectureFile } from '../tools/builtinDocs';
import { initializeNewProject, openProject, listProjects } from '../tools/projectSession';
import { runNewPipeline } from './newPipeline';

const HELP_TEXT = `Reserved commands:
  /new        Start a new project (Creates folder + architecture.md)
  /open       Open and run an existing project
  /list       List created projects
  /adddoc     Add reference documents for coding
  /help       Show this help
  /exit       Close the session`;

function formatElapsedTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const mins = minutes % 60;
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  }
  if (minutes > 0) {
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }
  return `${seconds}s`;
}

async function askUser(): Promise<string> {
  const { input } = await inquirer.prompt<{ input: string }>([
    {
      type: 'input',
      name: 'input',
      message: chalk.cyan('>'),
      prefix: ''
    }
  ]);
  return input.trim();
}

async function runProjectInTerminal(workDir: string): Promise<void> {
  const { execute } = await inquirer.prompt<{ execute: boolean }>([
    {
      type: 'confirm',
      name: 'execute',
      message: 'Do you want to run the project now?',
      default: false
    }
  ]);

  if (!execute) return;

  console.log(chalk.gray('\nOpening terminal...\n'));
  
  // Detect if it's Node.js project (has package.json) or HTML
  const packageJsonPath = path.join(workDir, 'package.json');
  const hasPackageJson = fs.existsSync(packageJsonPath);
  
  const command = hasPackageJson ? 'npm' : 'open';
  const args = hasPackageJson ? ['start'] : [workDir];

  const proc = spawn(command, args, {
    cwd: workDir,
    stdio: 'inherit',
    shell: true
  });

  proc.on('error', (err) => {
    console.log(chalk.red('[ Error ] ') + `Failed to run: ${err.message}`);
  });

  proc.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.gray('\nProject terminated.\n'));
    } else {
      console.log(chalk.yellow(`\nProcess terminated with code ${code}.\n`));
    }
  });
}

export async function runInteractiveSession(existing?: SessionData): Promise<void> {
  const session = existing ?? Session.newSession('Session ' + new Date().toISOString().slice(0, 16));
  Session.saveSession(session);

  // Block CTRL+C in this session - user must use /exit
  let ctrlCAttempts = 0;
  process.on('SIGINT', () => {
    ctrlCAttempts++;
    if (ctrlCAttempts === 1) {
      console.log(chalk.yellow('\n[ Warning ] Use /exit or /clear to control the session'));
      console.log(chalk.gray('(CTRL+C is blocked to prevent data loss)\n'));
    } else if (ctrlCAttempts >= 3) {
      console.log(chalk.red('\nForcing exit...'));
      process.exit(1);
    }
  });

  // setDisplayMode(currentMode); // Removed
  clearDisplay();
  printSimpleBanner();

  while (true) {
    const input = await askUser();
    if (input.length === 0) continue;

    clearDisplay();

    if (input === '/exit') {
      console.log(chalk.gray('Session closed.'));
      return;
    }

    if (input === '/help') {
      clearSessionScreen();
      console.log(chalk.gray(HELP_TEXT) + '\n');
      continue;
    }

    if (input === '/clear') {
      clearSessionScreen();
      continue;
    }

    if (input === '/new') {
      try {
        const project = await initializeNewProject();
        const result = await runNewPipeline(project);
        if (result.ok) {
          console.log(chalk.green('\n[ OK ] ') + 'Project completed successfully!');
        } else {
          console.log(chalk.red('\n[ Error ] ') + (result.error || 'Pipeline failure'));
        }
      } catch (err) {
        console.log(chalk.red('\n[ Cancelled ] ') + (err instanceof Error ? err.message : String(err)));
      }
      await pressEnter();
      clearSessionScreen();
      continue;
    }

    if (input === '/open') {
      const project = await openProject();
      if (project) {
        const result = await runNewPipeline(project);
        if (result.ok) {
          console.log(chalk.green('\n[ OK ] ') + 'Project update completed!');
        } else {
          console.log(chalk.red('\n[ Error ] ') + (result.error || 'Pipeline failure'));
        }
      }
      await pressEnter();
      clearSessionScreen();
      continue;
    }

    if (input === '/list') {
      clearSessionScreen();
      const projects = listProjects();
      
      if (projects.length === 0) {
        console.log(chalk.gray('\nNo projects created yet.\n'));
      } else {
        console.log(chalk.bold.cyan('\n=== Created Projects ===\n'));
        for (const proj of projects) {
          console.log(chalk.bold.white(proj.name));
          console.log(chalk.gray(`  ${proj.id}`));
          console.log(chalk.gray(`  Created: ${new Date(proj.createdAt).toLocaleString()}`));
          console.log();
        }
      }
      await pressEnter();
      clearSessionScreen();
      continue;
    }

    if (input === '/history' || input === '/historico') {
      await showHistory(session);
      clearSessionScreen();
      continue;
    }

    if (input === '/voices') {
      clearSessionScreen();
      console.log(renderLegend() + '\n');
      continue;
    }

    if (input === '/reset') {
      clearSessionScreen();
      await wipeMemory();
      say('brain', 'memory wiped');
      console.log();
      continue;
    }

    if (input === '/adddoc') {
      clearSessionScreen();
      await handleAddDoc();
      clearSessionScreen();
      continue;
    }

    // ANY OTHER INPUT IS CONSIDERED A NEW PROJECT/TASK
    Session.appendMessage(session, 'user', input);
    Session.saveSession(session);

    startStatus('Analyzing');
    const startTime = Date.now();
    try {
      stopStatus('Starting Project');
      const project = await initializeNewProject(input);
      const result = await runNewPipeline(project);
      
      const elapsedMs = Date.now() - startTime;
      const elapsed = formatElapsedTime(elapsedMs);
      
      if (result.ok) {
         console.log(chalk.green('[ OK ] ') + 'project ready');
         console.log(chalk.gray('Files in: ' + chalk.cyan(result.projectPath || '')));
      } else {
         console.log(chalk.red.bold('\n[ ERROR ] ') + chalk.red(result.error || 'pipeline failed'));
         console.log(chalk.gray('Files in: ' + chalk.cyan(result.projectPath || '')));
      }

      Session.appendMessage(session, 'assistant', result.ok ? `ok (task) ${result.projectPath}` : `failure (task)`);
      Session.saveSession(session);
      console.log();
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.gray(`⏱ Time: ${elapsed}`));
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      
      const action = await afterTaskMenu(result.projectPath);
      if (action === 'run' && result.projectPath) {
        await runProjectInTerminal(result.projectPath);
      }
      clearSessionScreen();
    } catch (err) {
      stopStatus('Error');
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red('[ Error ] ') + msg + '\n');
      Session.appendMessage(session, 'system', 'error: ' + msg);
      Session.saveSession(session);
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      await pressEnter();
      clearSessionScreen();
    }
  }
}

export function resumeSession(id: string): SessionData | null {
  return Session.loadSession(id);
}

interface SessionSummary {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

function summariseSessions(): SessionSummary[] {
  if (!fs.existsSync(SESSIONS_DIR)) return [];
  const files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json'));
  const summaries: Array<SessionSummary & { mtime: number }> = [];
  for (const f of files) {
    const full = path.join(SESSIONS_DIR, f);
    try {
      const raw = fs.readFileSync(full, 'utf-8');
      const parsed = JSON.parse(raw) as SessionData;
      summaries.push({
        id: parsed.id,
        title: parsed.title,
        updatedAt: parsed.updatedAt,
        messageCount: parsed.messages.length,
        mtime: fs.statSync(full).mtimeMs
      });
    } catch {
      // skip corrupt sessions
    }
  }
  return summaries
    .sort((a, b) => b.mtime - a.mtime)
    .map(({ id, title, updatedAt, messageCount }) => ({ id, title, updatedAt, messageCount }));
}

function renderCurrentHistory(session: SessionData): void {
  if (session.messages.length === 0) {
    console.log(chalk.gray('  (current session has no messages yet)'));
    return;
  }
  console.log(chalk.bold.cyan('Current session: ') + session.title);
  console.log(chalk.gray('  id=' + session.id + '  msgs=' + session.messages.length));
  console.log();
  for (const m of session.messages) {
    const ts = chalk.gray(m.timestamp.slice(11, 19));
    const tag = roleTag(m.role);
    const body = m.content.replace(/\s+/g, ' ').slice(0, 160);
    console.log(`  ${ts} ${tag} ${body}`);
  }
}

function roleTag(role: SessionMessage['role']): string {
  if (role === 'user') return chalk.cyan('[you   ]');
  if (role === 'assistant') return chalk.green('[Ra-Bit]');
  return chalk.gray('[sys   ]');
}

async function showHistory(session: SessionData): Promise<void> {
  freshScreen();
  console.log(chalk.bold.cyan('/history'));
  console.log();
  renderCurrentHistory(session);
  console.log();

  const past = summariseSessions().filter((s) => s.id !== session.id);
  if (past.length === 0) {
    console.log(chalk.gray('  (no previous sessions)'));
    console.log();
    await pressEnter();
    return;
  }

  const topN = past.slice(0, 15);
  const { pick } = await inquirer.prompt<{ pick: string }>([
    {
      type: 'list',
      name: 'pick',
      message: chalk.cyan('Previous sessions:'),
      pageSize: 12,
      choices: [
        ...topN.map((s) => ({
          name: `${chalk.bold(s.title)}  ${chalk.gray(s.updatedAt.replace('T', ' ').slice(0, 16) + '  msgs=' + s.messageCount + '  [' + s.id + ']')}`,
          value: s.id
        })),
        new inquirer.Separator(),
        { name: '[ Back to current session ]', value: '__back__' }
      ]
    }
  ]);

  if (pick === '__back__') return;

  const loaded = Session.loadSession(pick);
  if (!loaded) {
    console.log(chalk.red('[ Error ] ') + 'could not load session.');
    await pressEnter();
    return;
  }

  freshScreen();
  console.log(chalk.bold.cyan(loaded.title));
  console.log(chalk.gray('  id=' + loaded.id + '  created=' + loaded.createdAt + '  msgs=' + loaded.messages.length));
  console.log();
  if (loaded.messages.length === 0) {
    console.log(chalk.gray('  (empty session)'));
  } else {
    for (const m of loaded.messages) {
      const ts = chalk.gray(m.timestamp.slice(0, 19).replace('T', ' '));
      console.log(`  ${ts} ${roleTag(m.role)} ${m.content}`);
    }
  }
  console.log();
  await pressEnter();
}

async function handleAddDoc(): Promise<void> {
  while (true) {
    console.log(chalk.bold.cyan('\n=== /adddoc - Reference Documents ===\n'));
    console.log(chalk.gray('  Architect: ' + ARCHITECT_DOCS_DIR));
    console.log(chalk.gray('  Coder:     ' + CODER_DOCS_DIR + '\n'));

    const { agent } = await inquirer.prompt<{ agent: DocAgent | '__back__' }>([
      {
        type: 'list',
        name: 'agent',
        message: chalk.cyan('Select agent:'),
        prefix: '>',
        choices: [
          { name: '[ Architect ] - documents for planning projects', value: 'architect' },
          { name: '[ Coder ]     - documents for generating code', value: 'coder' },
          new inquirer.Separator(),
          { name: '[ Back ]', value: '__back__' }
        ]
      }
    ]);

    if (agent === '__back__') return;

    await handleDocAgent(agent as DocAgent);
  }
}

function openFolder(folderPath: string): void {
  const { spawn: spawnProc } = require('child_process') as typeof import('child_process');
  const proc = spawnProc('xdg-open', [folderPath], { detached: true, stdio: 'ignore' });
  proc.unref();
}

async function handleDocAgent(agent: DocAgent): Promise<void> {
  const dir = agent === 'architect' ? ARCHITECT_DOCS_DIR : CODER_DOCS_DIR;
  const label = agent === 'architect' ? 'Architect' : 'Coder';

  openFolder(dir);
  console.log(chalk.cyan(`\n[ Folder opened ] `) + chalk.gray(dir));
  console.log(chalk.gray('  Drag or copy files to the opened folder.\n'));

  while (true) {
    const docs = listDocs(agent);

    console.log(chalk.bold.cyan(`=== Docs of ${label} (${docs.length}) ===\n`));
    if (docs.length === 0) {
      console.log(chalk.gray('  (no documents yet)\n'));
    } else {
      for (const d of docs) {
        const kb = (d.size / 1024).toFixed(1);
        console.log(chalk.white(`  ${d.name}`) + chalk.gray(`  ${kb}kb  ${d.addedAt}`));
      }
      console.log();
    }

    type DocAction = 'architecture' | 'refresh' | 'remove' | 'back';
    const actionChoices: Array<{ name: string; value: DocAction }> = [
      { name: '[ Edit architecture.md ]  ' + chalk.gray('your architecture / requirements'), value: 'architecture' },
      { name: '[ Refresh list ]', value: 'refresh' },
    ];
    if (docs.length > 0) {
      actionChoices.push({ name: '[ Remove document ]', value: 'remove' });
    }
    actionChoices.push({ name: '[ Back ]', value: 'back' });

    const { action } = await inquirer.prompt<{ action: DocAction }>([
      {
        type: 'list',
        name: 'action',
        message: chalk.cyan('What do you want to do?'),
        prefix: '>',
        choices: actionChoices
      }
    ]);

    if (action === 'back') return;

    if (action === 'architecture') {
      openArchitectureFile(agent);
      console.log(chalk.green('\n[ OK ] ') + 'architecture.md opened in editor.');
      console.log(chalk.gray('       Paste your architecture there and save. Ra-Bit will follow everything in the file.\n'));
      continue;
    }

    if (action === 'refresh') {
      console.log();
      continue;
    }

    if (action === 'remove') {
      const currentDocs = listDocs(agent);
      const { target } = await inquirer.prompt<{ target: string }>([
        {
          type: 'list',
          name: 'target',
          message: 'Select document to remove:',
          prefix: '>',
          choices: [
            ...currentDocs.map((d) => ({ name: d.name, value: d.name })),
            new inquirer.Separator(),
            { name: '[ Cancel ]', value: '__cancel__' }
          ]
        }
      ]);
      if (target === '__cancel__') continue;
      const ok = removeDoc(agent, target);
      if (ok) {
        console.log(chalk.green('[ OK ] ') + `"${target}" removed.\n`);
      } else {
        console.log(chalk.red('[ Error ] ') + 'file not found.\n');
      }
    }
  }
}

async function pressEnter(): Promise<void> {
  await inquirer.prompt<{ _ack: string }>([
    { type: 'input', name: '_ack', message: chalk.gray('ENTER to return'), prefix: '' }
  ]);
}

async function afterTaskMenu(workDir?: string): Promise<'continue' | 'run' | 'exit'> {
  type ActionChoice = 'continue' | 'run' | 'exit';
  const choices: Array<{ name: string; value: ActionChoice }> = [
    { name: '[ Continue - What do you want to add or improve? ]', value: 'continue' },
  ];
  if (workDir) {
    choices.push({ name: '[ Run the project now ]', value: 'run' });
  }
  choices.push({ name: '[ Return to main menu ]', value: 'exit' });

  const { action } = await inquirer.prompt<{ action: ActionChoice }>([
    {
      type: 'list',
      name: 'action',
      message: chalk.cyan('What do you want to do?'),
      prefix: '>',
      choices
    }
  ]);
  return action;
}
