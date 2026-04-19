/**
 * Agent Configuration UI — redesigned.
 * Clean table display, Claude CLI flavor picker, all agents visible.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  loadConfig, saveConfig, ROLES, AgentRoleKey,
  getCoderCount, setCoderCount,
  CLAUDE_CLI_CONFIG,
  AgentConfig, listCustomPresets, saveCustomPreset, deleteCustomPreset
} from '../config/agents';
import { getAvailableModels } from '../tools/ollama';
import { PROVIDER_NAMES, ProviderName } from '../providers';
import { setupAnthropicKey, hasAnthropicKey } from '../setup/anthropicKey';
import { openclaudeAvailable } from '../tools/openclaude';
import { RoleBinding } from '../providers/types';

// ─── helpers ────────────────────────────────────────────────────────────────

function detectCurrentPreset(): string {
  const cfg = loadConfig();
  const providers = Object.values(cfg.models).map((b) => b.provider);
  const hasCliProvider  = providers.every((p) => p === 'claude-cli');
  const hasOllaProvider = providers.every((p) => p === 'ollama');
  if (hasCliProvider)  return 'Claude CLI';
  if (hasOllaProvider) return 'Ollama';
  return 'Mixed';
}

function modelBadge(b: RoleBinding): string {
  const model = b.provider === 'claude-cli' ? chalk.magentaBright(b.model)
    : b.provider === 'anthropic' ? chalk.blueBright(b.model)
    : chalk.greenBright(b.model);
  const effortTag = b.effort ? chalk.gray(`[${b.effort}]`) : '';
  return effortTag ? model + ' ' + effortTag : model;
}

const W = 60;
function pad(s: string, len: number): string {
  const clean = s.replace(/\x1B\[[0-9;]*m/g, '');
  const diff = s.length - clean.length;
  const target = len + diff;
  if (s.length >= target) return s;
  return s + ' '.repeat(target - s.length);
}

// ─── list view ──────────────────────────────────────────────────────────────

export async function listAgentsView(): Promise<void> {
  const cfg = loadConfig();
  const preset = detectCurrentPreset();

  console.log('');
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║' + pad(chalk.bold.cyan('  Configured Agents') + chalk.gray('  —  Mode: ') + chalk.yellow(preset), W) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');

  // Group roles visually
  const groups: Array<{ label: string; keys: AgentRoleKey[] }> = [
    { label: 'Planning', keys: ['architect'] },
    { label: 'Coding',   keys: ['juniorCoder', 'seniorCoder', 'coder', 'designCoder'] },
    { label: 'Quality',    keys: ['reviewer', 'organizer'] },
  ];

  for (const group of groups) {
    const groupLine = chalk.gray(`  ── ${group.label} `);
    console.log('║' + pad(groupLine, W) + '║');
    for (const key of group.keys) {
      const role = ROLES.find((r) => r.key === key);
      if (!role) continue;
      const b = cfg.models[key];
      const label = pad(chalk.white('  ' + role.label), 18);
      const badge = modelBadge(b);
      const providerStr = chalk.gray(b.provider + '/') + badge;
      const line = label + '  ' + providerStr;
      console.log('║' + pad(line, W) + '║');
    }
  }

  console.log('╠' + '═'.repeat(W) + '╣');
  const coderCount = getCoderCount();
  const coderLine = chalk.gray('  Coders per phase: ') + chalk.yellow(String(coderCount)) + chalk.gray(' in parallel');
  console.log('║' + pad(coderLine, W) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');
  console.log('');
}

// ─── main menu ──────────────────────────────────────────────────────────────

export type AgentConfigChoice =
  | 'list-agents'
  | 'edit-agent'
  | 'coder-count'
  | 'use-claude-cli'
  | 'save-preset'
  | 'load-preset'
  | 'reset-defaults'
  | 'back';

export async function agentConfigMenu(): Promise<AgentConfigChoice> {
  const preset = detectCurrentPreset();
  const coderCount = getCoderCount();
  const coderLabel = coderCount === 1 ? '1 coder (sequential)' : `${coderCount} per phase (parallel)`;

  const { choice } = await inquirer.prompt<{ choice: AgentConfigChoice }>([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('Agents') + chalk.gray('  —  current mode: ') + chalk.yellow(preset),
      prefix: '>',
      choices: [
        new inquirer.Separator(chalk.gray('  ── visualize ──')),
        { name: '  View All Agents', value: 'list-agents' },
        new inquirer.Separator(chalk.gray('  ── configure ──')),
        { name: '  Edit Individual Agent', value: 'edit-agent' },
        {
          name: `  Coders per Phase  ${chalk.gray('current: ' + coderLabel)}`,
          value: 'coder-count'
        },
        new inquirer.Separator(chalk.gray('  ── presets ──')),
        { name: '  Use Claude CLI  ' + chalk.gray('(local, no API key)'), value: 'use-claude-cli' },
        { name: '  Save Current Config as Preset', value: 'save-preset' },
        { name: '  Load Custom Preset', value: 'load-preset' },
        new inquirer.Separator(chalk.gray('  ────────────')),
        { name: '  Restore Defaults', value: 'reset-defaults' },
        { name: '  Back', value: 'back' }
      ]
    }
  ]);
  return choice;
}

// ─── coder count ────────────────────────────────────────────────────────────

export async function selectCoderCount(): Promise<void> {
  const current = getCoderCount();

  console.log('');
  console.log(chalk.bold.cyan('  Coders per Phase\n'));
  console.log(chalk.gray('  Each phase of the plan runs N coders in parallel.'));
  console.log(chalk.gray('  More coders = more speed, more tokens consumed.\n'));

  const { count } = await inquirer.prompt<{ count: 1 | 2 | 3 }>([
    {
      type: 'list',
      name: 'count',
      message: chalk.cyan('How many coders per phase?'),
      prefix: '>',
      choices: [
        { name: `  1 coder   — sequential, simple${current === 1 ? chalk.green('  [current]') : ''}`,    value: 1 },
        { name: `  2 coders  — two files in parallel${current === 2 ? chalk.green('  [current]') : ''}`, value: 2 },
        { name: `  3 coders  — three files in parallel${current === 3 ? chalk.green('  [current]') : ''}`, value: 3 }
      ]
    }
  ]);

  setCoderCount(count);
  console.log(chalk.green('\n  [ OK ] ') + `Coders configured: ${count} per phase\n`);
}

// ─── edit single agent ──────────────────────────────────────────────────────

export async function selectAgentToEdit(): Promise<AgentRoleKey | null> {
  const { roleKey } = await inquirer.prompt<{ roleKey: AgentRoleKey | '__cancel__' }>([
    {
      type: 'list',
      name: 'roleKey',
      message: chalk.cyan('Select agent:'),
      prefix: '>',
      choices: [
        ...ROLES.map((role) => {
          const b = loadConfig().models[role.key];
          const badge = chalk.gray(`[${b.provider}/`) + modelBadge(b) + chalk.gray(']');
          return {
            name: `  ${pad(role.label, 14)}  ${badge}`,
            value: role.key
          };
        }),
        new inquirer.Separator(),
        { name: '  Cancel', value: '__cancel__' }
      ]
    }
  ]);
  return roleKey === '__cancel__' ? null : roleKey;
}

async function selectProvider(current: ProviderName): Promise<ProviderName | null> {
  const labels: Record<ProviderName, string> = {
    'ollama':     'Ollama       (local models)',
    'anthropic':  'Claude API   (Anthropic, requires API key)',
    'claude-cli': 'Claude CLI   (local, no API key)'
  };
  const { provider } = await inquirer.prompt<{ provider: ProviderName | '__cancel__' }>([
    {
      type: 'list',
      name: 'provider',
      message: chalk.cyan('Provider:'),
      prefix: '>',
      choices: [
        ...PROVIDER_NAMES.filter(p => p !== 'anthropic').map((p) => ({
          name: `  ${labels[p]}${p === current ? chalk.green('  [current]') : ''}`,
          value: p
        })),
        new inquirer.Separator(),
        { name: '  Cancel', value: '__cancel__' as const }
      ]
    }
  ]);
  return provider === '__cancel__' ? null : provider;
}

async function selectOllamaModel(current: string): Promise<string | null> {
  try {
    const models = await getAvailableModels();
    if (models.length === 0) {
      console.log(chalk.red('\n  [ Error ] ') + 'no models found in Ollama.\n');
      return null;
    }
    const { model } = await inquirer.prompt<{ model: string }>([
      {
        type: 'list',
        name: 'model',
        message: chalk.cyan('Ollama Model:'),
        prefix: '>',
        choices: [
          ...models.map((m: string) => ({
            name: m === current ? `  ${m}  ${chalk.green('[current]')}` : `  ${m}`,
            value: m
          })),
          new inquirer.Separator(),
          { name: '  Cancel', value: '__cancel__' }
        ]
      }
    ]);
    return model === '__cancel__' ? null : model;
  } catch {
    console.log(chalk.red('\n  [ Error ] ') + 'could not list Ollama models.\n');
    return null;
  }
}

async function selectClaudeCliModel(current: string): Promise<string | null> {
  const models = [
    { name: `  haiku   — fast, light, cheap${current === 'haiku' ? chalk.green('  [current]') : ''}`,    value: 'haiku' },
    { name: `  sonnet  — balanced, recommended${current === 'sonnet' ? chalk.green('  [current]') : ''}`, value: 'sonnet' },
    { name: `  opus    — more powerful, more slow${current === 'opus' ? chalk.green('  [current]') : ''}`,  value: 'opus' },
  ];
  const { model } = await inquirer.prompt<{ model: string }>([{
    type: 'list',
    name: 'model',
    message: chalk.cyan('Claude CLI Model:'),
    prefix: '>',
    choices: [...models, new inquirer.Separator(), { name: '  Cancel', value: '__cancel__' }]
  }]);
  return model === '__cancel__' ? null : model;
}

async function selectEffort(current?: string): Promise<'low' | 'medium' | 'high' | null> {
  const c = current ?? 'medium';
  const { effort } = await inquirer.prompt<{ effort: string }>([{
    type: 'list',
    name: 'effort',
    message: chalk.cyan('Effort level (--effort):'),
    prefix: '>',
    choices: [
      { name: `  low    — fast, shorter responses${c === 'low'    ? chalk.green('  [current]') : ''}`, value: 'low' },
      { name: `  medium — balanced${c === 'medium' ? chalk.green('  [current]') : ''}`,                    value: 'medium' },
      { name: `  high   — deep thinking, better quality${c === 'high'   ? chalk.green('  [current]') : ''}`, value: 'high' },
      new inquirer.Separator(),
      { name: '  Keep agent default', value: '__default__' }
    ]
  }]);
  if (effort === '__default__') return null;
  return effort as 'low' | 'medium' | 'high';
}

async function askAnthropicModel(current: string): Promise<string | null> {

export async function editAgent(): Promise<boolean> {
  const roleKey = await selectAgentToEdit();
  if (!roleKey) return false;

  const role = ROLES.find((r) => r.key === roleKey);
  if (!role) return false;

  const cfg = loadConfig();
  const current = cfg.models[roleKey];

  console.log('');
  console.log(chalk.bold.white('  ' + role.label));
  console.log(chalk.gray('  ' + role.description));
  console.log(chalk.gray(`  Current: ${current.provider}/${current.model}`));
  console.log('');

  const provider = await selectProvider(current.provider);
  if (!provider) return false;

  let model: string | null = null;
  let effort: 'low' | 'medium' | 'high' | undefined = undefined;

  if (provider === 'ollama') {
    model = await selectOllamaModel(current.model);
  } else if (provider === 'claude-cli') {
    model = await selectClaudeCliModel(current.model);
    if (model) {
      const picked = await selectEffort(current.effort);
      effort = picked ?? undefined;
    }
  }
  if (!model) return false;

  const newBinding: RoleBinding = { provider, model, ...(effort ? { effort } : {}) };

  if (provider === current.provider && model === current.model && effort === current.effort) {
    console.log(chalk.gray('\n  (nothing changed)\n'));
    return false;
  }

  cfg.models[roleKey] = newBinding;
  saveConfig(cfg);
  const effortStr = effort ? chalk.gray(` [${effort}]`) : '';
  
  console.log(chalk.bold.green('\n  ────────────────────────────────────────────────────────────'));
  console.log(chalk.green(`  ✓ PRESET SAVED FOR: ${role.label.toUpperCase()}`));
  console.log(chalk.bold.green('  ────────────────────────────────────────────────────────────'));
  console.log(chalk.white('  Model:   ') + chalk.bold(provider + '/' + model) + effortStr);
  console.log(chalk.bold.green('  ────────────────────────────────────────────────────────────\n'));
  
  await new Promise(r => setTimeout(r, 1200));
  return true;
}

// ─── Claude CLI preset + flavor picker ──────────────────────────────────────

type ClaudeCliFlavor = 'fast' | 'balanced' | 'powerful' | 'max' | 'custom';

interface FlavorBinding { model: string; effort: 'low' | 'medium' | 'high' }

const CLI_FLAVORS: Record<Exclude<ClaudeCliFlavor, 'custom'>, Partial<Record<AgentRoleKey, FlavorBinding>>> = {
  fast: {
    architect:   { model: 'haiku',  effort: 'medium' },
    coder:       { model: 'haiku',  effort: 'medium' },
    juniorCoder: { model: 'haiku',  effort: 'low' },
    seniorCoder: { model: 'haiku',  effort: 'medium' },
    designCoder: { model: 'haiku',  effort: 'low' },
    reviewer:    { model: 'haiku',  effort: 'low' },
    organizer:   { model: 'haiku',  effort: 'low' }
  },
  balanced: {
    architect:   { model: 'sonnet', effort: 'high' },
    coder:       { model: 'sonnet', effort: 'high' },
    juniorCoder: { model: 'haiku',  effort: 'medium' },
    seniorCoder: { model: 'sonnet', effort: 'high' },
    designCoder: { model: 'sonnet', effort: 'medium' },
    reviewer:    { model: 'haiku',  effort: 'medium' },
    organizer:   { model: 'haiku',  effort: 'low' }
  },
  powerful: {
    architect:   { model: 'sonnet', effort: 'high' },
    coder:       { model: 'sonnet', effort: 'high' },
    juniorCoder: { model: 'sonnet', effort: 'medium' },
    seniorCoder: { model: 'sonnet', effort: 'high' },
    designCoder: { model: 'sonnet', effort: 'high' },
    reviewer:    { model: 'sonnet', effort: 'medium' },
    organizer:   { model: 'haiku',  effort: 'low' }
  },
  max: {
    architect:   { model: 'opus',   effort: 'high' },
    coder:       { model: 'opus',   effort: 'high' },
    juniorCoder: { model: 'sonnet', effort: 'high' },
    seniorCoder: { model: 'opus',   effort: 'high' },
    designCoder: { model: 'opus',   effort: 'high' },
    reviewer:    { model: 'sonnet', effort: 'medium' },
    organizer:   { model: 'sonnet', effort: 'low' }
  }
};

async function pickClaudeCliFlavor(): Promise<ClaudeCliFlavor | null> {
  console.log('');
  const { flavor } = await inquirer.prompt<{ flavor: ClaudeCliFlavor | '__cancel__' }>([
    {
      type: 'list',
      name: 'flavor',
      message: chalk.cyan('Select operation mode:'),
      prefix: '>',
      choices: [
        {
          name: '  Fast        ' + chalk.gray('haiku everywhere — lower cost, faster'),
          value: 'fast'
        },
        {
          name: '  Balanced    ' + chalk.gray('light haiku + heavy sonnet — recommended default'),
          value: 'balanced'
        },
        {
          name: '  Powerful    ' + chalk.gray('sonnet for coding — better quality'),
          value: 'powerful'
        },
        {
          name: '  Maximum     ' + chalk.gray('opus everywhere — maximum quality, slower'),
          value: 'max'
        },
        {
          name: '  Custom      ' + chalk.gray('I choose model per agent'),
          value: 'custom'
        },
        new inquirer.Separator(),
        { name: '  Cancel', value: '__cancel__' }
      ]
    }
  ]);
  return flavor === '__cancel__' ? null : flavor;
}

async function pickCustomCliFlavor(): Promise<Record<AgentRoleKey, FlavorBinding> | null> {
  console.log('');
  console.log(chalk.gray('  Configure model and effort per agent group:\n'));

  const groups: Array<{ label: string; keys: AgentRoleKey[] }> = [
    { label: 'Planning (architect)', keys: ['architect'] },
    { label: 'Junior Coder (base phase)',             keys: ['juniorCoder'] },
    { label: 'Senior Coder (complex phase)',          keys: ['seniorCoder'] },
    { label: 'Generic Coder + Design',              keys: ['coder', 'designCoder'] },
    { label: 'Quality (reviewer, organizer)',       keys: ['reviewer', 'organizer'] },
  ];

  const modelChoices = [
    { name: '  haiku   — fast and light',  value: 'haiku' },
    { name: '  sonnet  — balanced',    value: 'sonnet' },
    { name: '  opus    — maximum power',   value: 'opus' },
  ];

  const effortChoices = [
    { name: '  low    — fast, direct responses', value: 'low' },
    { name: '  medium — balanced',                value: 'medium' },
    { name: '  high   — deep thinking',       value: 'high' },
  ];

  const result: Partial<Record<AgentRoleKey, FlavorBinding>> = {};

  for (const group of groups) {
    console.log(chalk.bold.white(`  ${group.label}`));
    const { model } = await inquirer.prompt<{ model: string }>([{
      type: 'list', name: 'model',
      message: chalk.cyan('  Model:'), prefix: '   ',
      choices: modelChoices
    }]);
    const { effort } = await inquirer.prompt<{ effort: string }>([{
      type: 'list', name: 'effort',
      message: chalk.cyan('  Effort:'), prefix: '   ',
      choices: effortChoices
    }]);
    for (const key of group.keys) {
      result[key] = { model, effort: effort as 'low' | 'medium' | 'high' };
    }
    console.log('');
  }

  return result as Record<AgentRoleKey, FlavorBinding>;
}

function printCliPresetSummary(cfg: AgentConfig): void {
  console.log('');
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║' + pad(chalk.bold.cyan('  Claude CLI Preset Applied'), W) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  for (const role of ROLES) {
    const b = cfg.models[role.key];
    const line = `  ${pad(role.label, 14)}  ${chalk.gray(b.provider + '/')}${modelBadge(b)}`;
    console.log('║' + pad(line, W) + '║');
  }
  console.log('╠' + '═'.repeat(W) + '╣');
  const coderCount = getCoderCount();
  console.log('║' + pad(chalk.gray(`  Coders: ${coderCount} per phase  |  Timeout: 5min`), W) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');
  console.log('');
}

export async function applyClaudeCliPreset(): Promise<void> {
  const available = await openclaudeAvailable();
  if (!available) {
    console.log(chalk.red('\n  [ Error ] ') + '\'claude\' binary not found in PATH.');
    console.log(chalk.gray('  Install Claude Code: https://claude.ai/code'));
    console.log();
    return;
  }

  const flavor = await pickClaudeCliFlavor();
  if (!flavor) return;

  const cfg = loadConfig();
  cfg.models = { ...CLAUDE_CLI_CONFIG.models };
  cfg.params.agentTimeoutMs = CLAUDE_CLI_CONFIG.params.agentTimeoutMs;
  cfg.params.coderCount = CLAUDE_CLI_CONFIG.params.coderCount;

  if (flavor === 'custom') {
    const custom = await pickCustomCliFlavor();
    if (!custom) return;
    for (const role of ROLES) {
      const fb = custom[role.key];
      if (fb) cfg.models[role.key] = { provider: 'claude-cli', model: fb.model, effort: fb.effort };
    }
  } else {
    const flavorMap = CLI_FLAVORS[flavor];
    for (const role of ROLES) {
      const fb = flavorMap[role.key];
      if (fb) cfg.models[role.key] = { provider: 'claude-cli', model: fb.model, effort: fb.effort };
    }
  }

  saveConfig(cfg);
  printCliPresetSummary(cfg);
}

// ─── Claude API preset ──────────────────────────────────────────────────────

// applyClaudePreset removed as it is no longer used.

// ─── reset ──────────────────────────────────────────────────────────────────

export async function confirmResetDefaults(): Promise<boolean> {
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([{
    type: 'confirm',
    name: 'confirm',
    message: 'Restore default configuration for all agents?',
    default: false
  }]);
  return confirm;
}

export async function handleSavePreset(): Promise<void> {
  const { name } = await inquirer.prompt<{ name: string }>([
    {
      type: 'input',
      name: 'name',
      message: chalk.cyan('Preset name:'),
      prefix: '>',
      validate: (input) => input.trim().length > 0 || 'Name cannot be empty'
    }
  ]);

  const cfg = loadConfig();
  saveCustomPreset(name.trim(), cfg);
  console.log(chalk.green(`\n  ✓ PRESET "${name.trim().toUpperCase()}" SAVED SUCCESSFULLY!\n`));
}

export async function handleLoadPreset(): Promise<void> {
  const presets = listCustomPresets();
  const names = Object.keys(presets);

  if (names.length === 0) {
    console.log(chalk.yellow('\n  No custom presets found.\n'));
    return;
  }

  const { presetName } = await inquirer.prompt<{ presetName: string | '__cancel__' }>([
    {
      type: 'list',
      name: 'presetName',
      message: chalk.cyan('Select preset to load:'),
      prefix: '>',
      choices: [
        ...names.map((n) => ({ name: `  ${n}`, value: n })),
        new inquirer.Separator(),
        { name: '  Delete a preset...', value: '__delete__' },
        { name: '  Cancel', value: '__cancel__' }
      ]
    }
  ]);

  if (presetName === '__cancel__') return;

  if (presetName === '__delete__') {
    const { toDelete } = await inquirer.prompt<{ toDelete: string | '__cancel__' }>([
      {
        type: 'list',
        name: 'toDelete',
        message: chalk.red('Select preset to DELETE:'),
        choices: [...names.map((n) => ({ name: `  ${n}`, value: n })), { name: '  Cancel', value: '__cancel__' }]
      }
    ]);
    if (toDelete !== '__cancel__') {
      deleteCustomPreset(toDelete);
      console.log(chalk.red(`\n  ✗ PRESET "${toDelete.toUpperCase()}" DELETED.\n`));
    }
    return;
  }

  saveConfig(presets[presetName]);
  console.log(chalk.green(`\n  ✓ PRESET "${presetName.toUpperCase()}" LOADED!\n`));
}
