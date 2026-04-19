/**
 * Project Session Manager
 * Manages project creation and architecture.md handling.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { PROJECTS_DIR } from './paths';

export interface ProjectSession {
  id: string;
  name: string;
  path: string;
  architectureFile: string;
  createdAt: string;
}

/**
 * Creates new project folder and architecture.md
 */
export async function initializeNewProject(suggestedName?: string): Promise<ProjectSession> {
  console.log('\n' + chalk.bold.cyan('[ New Project ]'));
  
  let projectName = suggestedName;
  
  if (!projectName) {
    const { inputName } = await inquirer.prompt<{ inputName: string }>([
      {
        type: 'input',
        name: 'inputName',
        message: chalk.white('Project name:'),
        prefix: chalk.cyan('  >')
      }
    ]);
    projectName = inputName;
  }

  if (!projectName.trim()) {
    throw new Error('Project name is required');
  }

  // Create project directory
  const timestamp = Date.now().toString(36);
  const projectId = `${projectName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;
  const projectPath = path.join(PROJECTS_DIR, projectId);

  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }

  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  // Create architecture.md file with template
  const architectureFile = path.join(projectPath, 'architecture.md');
  
  if (!fs.existsSync(architectureFile)) {
    const template = `# Architecture - ${projectName}

## Description
Describe your project architecture here.

## File Structure

### Backend / Core
- \`src/main.ts\` - Main file
- \`src/utils.ts\` - Utility functions
- \`src/types.ts\` - TypeScript types

### Frontend
- \`public/index.html\` - Main HTML
- \`src/index.tsx\` - React App
- \`src/components/\` - React Components

### Configuration
- \`package.json\` - Dependencies
- \`tsconfig.json\` - TypeScript Config
- \`.env\` - Environment variables

## Technologies
- Node.js
- TypeScript
- React (optional)
- ...

## Core Dependencies
- express (backend)
- react (frontend)
- axios (http client)
- ...

## Application Flow
1. User accesses /
2. Server returns index.html
3. React renders components
4. API calls to /api/*
5. ...

## Important Notes
- Description of any architectural pattern
- Compatibility restrictions
- Performance observations
`;
    
    fs.writeFileSync(architectureFile, template, 'utf-8');
  }

  console.log(chalk.bold.green('\n────────────────────────────────────────────────────────────'));
  console.log(chalk.bold.green('  ✓ PROJECT INITIALIZED SUCCESSFULLY!'));
  console.log(chalk.bold.green('────────────────────────────────────────────────────────────'));
  console.log(chalk.white('  Folder:    ') + chalk.cyan(projectPath));
  console.log(chalk.white('  File:      ') + chalk.cyan('architecture.md'));
  console.log(chalk.bold.green('────────────────────────────────────────────────────────────\n'));

  // Open file in editor
  console.log(chalk.cyan('\n→ Opening architecture.md in editor...'));
  console.log(chalk.gray('  Fill in the detailed architecture of your project'));
  console.log(chalk.gray('  Save the file when finished (Ctrl+S)'));
  console.log();

  await openInEditor(architectureFile);

  // Manual confirmation to ensure user is done
  console.log(chalk.yellow('\n[ Important ] ') + 'When finished editing and saving, confirm below.');
  await inquirer.prompt([{ type: 'input', name: 'ready', message: 'Press ENTER to continue...', prefix: '>' }]);

  // Check if edited
  let content = fs.readFileSync(architectureFile, 'utf-8');
  if (content.includes('Describe your project architecture') || content.length < 100) {
    const { action } = await inquirer.prompt<{ action: 'iterative' | 'manual' | 'cancel' }>([
      {
        type: 'list',
        name: 'action',
        message: chalk.yellow('Architecture.md seems to be empty.'),
        choices: [
          { name: 'Fill now via terminal (Iterative)', value: 'iterative' },
          { name: 'Continue empty (Edit manually later)', value: 'manual' },
          { name: 'Cancel project', value: 'cancel' }
        ]
      }
    ]);

    if (action === 'cancel') {
      fs.rmSync(projectPath, { recursive: true });
      throw new Error('Project cancelled');
    }

    if (action === 'iterative') {
      await fillArchitectureIteratively(architectureFile, projectName);
    }
  }

  return {
    id: projectId,
    name: projectName,
    path: projectPath,
    architectureFile,
    createdAt: new Date().toISOString()
  };
}

/**
 * Opens file in system's default editor
 */
async function openInEditor(filePath: string): Promise<void> {
  return new Promise((resolve) => {
    let command: string;
    let args: string[] = [];

    // Detect editor/OS
    if (process.platform === 'win32') {
      command = 'notepad';
      args = [filePath];
    } else if (process.platform === 'darwin') {
      command = 'open';
      args = ['-t', filePath]; // -t opens in default text editor
    } else {
      // Linux - try common ones
      const editors = [process.env.EDITOR, 'code', 'cursor', 'gedit', 'nano', 'vi'].filter(Boolean);
      command = 'xdg-open'; // Fallback to system default
      args = [filePath];
      
      // If we find a specific editor in env or common paths, we might prefer it, 
      // but xdg-open is safest for "opening"
    }

    try {
      const proc = spawn(command, args, { stdio: 'inherit', detached: true });
      proc.on('error', () => {
        // If xdg-open fails, try nano as last resort
        spawn('nano', [filePath], { stdio: 'inherit' });
      });
      // We don't necessarily wait for GUI editors to close, 
      // hence the manual confirmation above.
      resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * List existing projects
 */
export function listProjects(): ProjectSession[] {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) return [];

    const projects: ProjectSession[] = [];
    const dirs = fs.readdirSync(PROJECTS_DIR);

    for (const dir of dirs) {
      const projectPath = path.join(PROJECTS_DIR, dir);
      const archFile = path.join(projectPath, 'architecture.md');

      if (fs.existsSync(archFile)) {
        const stat = fs.statSync(projectPath);
        projects.push({
          id: dir,
          name: dir.split('-').slice(0, -1).join(' '),
          path: projectPath,
          architectureFile: archFile,
          createdAt: stat.birthtime.toISOString()
        });
      }
    }

    return projects.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

/**
 * Open existing project
 */
export async function openProject(): Promise<ProjectSession | null> {
  const projects = listProjects();

  if (projects.length === 0) {
    console.log(chalk.yellow('\nNo projects found. Create a new one with: > /new'));
    return null;
  }

  const choices = projects.map((p) => ({
    name: `${p.name} (${new Date(p.createdAt).toLocaleDateString()})`,
    value: p
  }));

  const { project } = await inquirer.prompt<{ project: ProjectSession }>([
    {
      type: 'list',
      name: 'project',
      message: chalk.white('Choose project:'),
      choices
    }
  ]);

  return project;
}

/**
 * Fills architecture iteratively by asking file by file
 */
async function fillArchitectureIteratively(filePath: string, projectName: string): Promise<void> {
  console.log(chalk.bold.cyan('\n  [ Architecture Definition ]'));
  console.log(chalk.gray('  Add the main files that Rabit should create.'));

  const files: Array<{ path: string, desc: string }> = [];

  while (true) {
    const { filePath: inputPath } = await inquirer.prompt<{ filePath: string }>([
      {
        type: 'input',
        name: 'filePath',
        message: chalk.white('File path (e.g. src/main.ts) or empty to finish:'),
        prefix: chalk.cyan('  +')
      }
    ]);

    if (!inputPath.trim()) break;

    const { fileDesc } = await inquirer.prompt<{ fileDesc: string }>([
      {
        type: 'input',
        name: 'fileDesc',
        message: chalk.white(`Description for ${inputPath}:`),
        prefix: chalk.cyan('  ?')
      }
    ]);

    files.push({ path: inputPath.trim(), desc: fileDesc.trim() });
  }

  if (files.length === 0) return;

  let archContent = `# Architecture - ${projectName}\n\n`;
  archContent += `## Generated File Structure\n\n`;
  
  for (const f of files) {
    archContent += `- \`${f.path}\` - ${f.desc}\n`;
  }

  archContent += `\n## Notes\n- Architecture generated via Rabit's interactive interface.\n`;
  
  fs.writeFileSync(filePath, archContent, 'utf-8');
  console.log(chalk.green(`\n  ✓ ${files.length} files registered in architecture.md!\n`));
}
