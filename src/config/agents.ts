/**
 * Agent configuration store.
 * Each role binds to a provider + model. The provider layer handles the
 * actual API call (Ollama local, Anthropic API, etc). Legacy string configs
 * from older versions are migrated on load.
 */

import * as fs from 'fs';
import * as path from 'path';
import { CLLAMA_ROOT, ensureDirectories } from '../tools/paths';
import { RoleBinding, ProviderName } from '../providers/types';

export const CONFIG_PATH = path.join(CLLAMA_ROOT, 'config.json');
export const PRESETS_PATH = path.join(CLLAMA_ROOT, 'presets.json');

export type AgentRoleKey =
  | 'architect'
  | 'coder'
  | 'juniorCoder'
  | 'seniorCoder'
  | 'designCoder'
  | 'reviewer'
  | 'organizer';

export interface AgentConfig {
  models: Record<AgentRoleKey, RoleBinding>;
  params: {
    agentTimeoutMs: number;
    coderCount: 1 | 2 | 3;
    executionMode?: 'ask' | 'code' | 'plan';
  };
}

const DEFAULT_BINDING: RoleBinding = { provider: 'ollama', model: 'qwen3.6:latest' };

export const DEFAULT_CONFIG: AgentConfig = {
  models: {
    architect:   { provider: 'ollama', model: 'llama3.1:8b' },
    coder:       { provider: 'ollama', model: 'deepseek-coder-v2:latest' },
    juniorCoder: { provider: 'ollama', model: 'qwen3.5:latest' },
    seniorCoder: { provider: 'ollama', model: 'deepseek-coder-v2:latest' },
    designCoder: { provider: 'ollama', model: 'qwen3.5:latest' },
    reviewer:    { provider: 'ollama', model: 'qwen2.5-coder:7b' },
    organizer:   { provider: 'ollama', model: 'qwen3.5:latest' }
  },
  params: {
    agentTimeoutMs: 15 * 60_000,
    coderCount: 1,
    executionMode: 'ask'
  }
};

export interface RoleMeta {
  key: AgentRoleKey;
  label: string;
  description: string;
}

/**
 * Preset for using the local `claude` binary (Claude Code installed on the machine).
 * No API key — uses existing Claude Code login.
 * Light tasks use Haiku, heavy tasks use Sonnet.
 */
export const CLAUDE_CLI_CONFIG: AgentConfig = {
  models: {
    architect:   { provider: 'claude-cli', model: 'sonnet', effort: 'high' },
    coder:       { provider: 'claude-cli', model: 'sonnet', effort: 'high' },
    juniorCoder: { provider: 'claude-cli', model: 'haiku',  effort: 'medium' },
    seniorCoder: { provider: 'claude-cli', model: 'sonnet', effort: 'high' },
    designCoder: { provider: 'claude-cli', model: 'sonnet', effort: 'medium' },
    reviewer:    { provider: 'claude-cli', model: 'haiku',  effort: 'medium' },
    organizer:   { provider: 'claude-cli', model: 'haiku',  effort: 'low' }
  },
  params: {
    agentTimeoutMs: 5 * 60_000,
    coderCount: 3,
    executionMode: 'ask'
  }
};

export const ROLES: ReadonlyArray<RoleMeta> = [
  { key: 'architect',   label: 'Architect',    description: 'plans file structure and phases' },
  { key: 'juniorCoder', label: 'Junior Coder', description: 'generates base files (structure, types, config)' },
  { key: 'seniorCoder', label: 'Senior Coder', description: 'generates complex logic, integration, security' },
  { key: 'coder',       label: 'Coder',        description: 'generic coder (fallback)' },
  { key: 'designCoder', label: 'Design Coder', description: 'generates CSS and professional design' },
  { key: 'reviewer',    label: 'Reviewer',     description: 'audits and fixes generated code' },
  { key: 'organizer',   label: 'Organizer',    description: 'organizes final folder structure' }
];

let cache: AgentConfig | null = null;

function normaliseBinding(raw: unknown): RoleBinding | null {
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return { provider: 'ollama', model: raw.trim() };
  }
  if (raw && typeof raw === 'object') {
    const r = raw as Partial<RoleBinding>;
    if (typeof r.model === 'string' && r.model.trim().length > 0) {
      const provider: ProviderName =
        r.provider === 'anthropic' ? 'anthropic' :
        r.provider === 'claude-cli' ? 'claude-cli' : 'ollama';
      const effort: RoleBinding['effort'] =
        r.effort === 'low' || r.effort === 'medium' || r.effort === 'high' ? r.effort : undefined;
      return { provider, model: r.model.trim(), ...(effort ? { effort } : {}) };
    }
  }
  return null;
}

function mergeModels(
  base: Record<AgentRoleKey, RoleBinding>,
  incoming: unknown
): Record<AgentRoleKey, RoleBinding> {
  const out = { ...base };
  if (incoming && typeof incoming === 'object') {
    for (const role of ROLES) {
      const candidate = normaliseBinding((incoming as Record<string, unknown>)[role.key]);
      if (candidate) out[role.key] = candidate;
    }
  }
  return out;
}

export function loadConfig(force = false): AgentConfig {
  if (cache && !force) return cache;
  ensureDirectories();
  if (!fs.existsSync(CONFIG_PATH)) {
    cache = {
      models: { ...DEFAULT_CONFIG.models },
      params: { ...DEFAULT_CONFIG.params }
    };
    return cache;
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as { models?: unknown; params?: Partial<AgentConfig['params']> };
    cache = {
      models: mergeModels({ ...DEFAULT_CONFIG.models }, parsed.models),
      params: { ...DEFAULT_CONFIG.params, ...(parsed.params ?? {}) }
    };
  } catch {
    cache = {
      models: { ...DEFAULT_CONFIG.models },
      params: { ...DEFAULT_CONFIG.params }
    };
  }
  return cache;
}

export function saveConfig(cfg: AgentConfig): void {
  ensureDirectories();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  cache = cfg;
}

export function resetConfig(): AgentConfig {
  const fresh: AgentConfig = {
    models: { ...DEFAULT_CONFIG.models },
    params: { ...DEFAULT_CONFIG.params }
  };
  saveConfig(fresh);
  return fresh;
}

export function getBinding(role: AgentRoleKey): RoleBinding {
  return loadConfig().models[role];
}

export function getParam<K extends keyof AgentConfig['params']>(key: K): AgentConfig['params'][K] {
  return loadConfig().params[key];
}

export function getCoderCount(): 1 | 2 | 3 {
  const n = loadConfig().params.coderCount;
  return n === 2 ? 2 : n === 3 ? 3 : 1;
}

export function setCoderCount(n: 1 | 2 | 3): void {
  const cfg = loadConfig();
  cfg.params.coderCount = n;
  saveConfig(cfg);
}

export function setExecutionMode(mode: 'ask' | 'code' | 'plan'): void {
  const cfg = loadConfig();
  cfg.params.executionMode = mode;
  saveConfig(cfg);
}

export function getExecutionMode(): 'ask' | 'code' | 'plan' {
  return loadConfig().params.executionMode ?? 'ask';
}

export function setBinding(role: AgentRoleKey, binding: RoleBinding): void {
  const cfg = loadConfig();
  cfg.models[role] = binding;
  saveConfig(cfg);
}

/**
 * Lista presets customizados salvos pelo usuario
 */
export function listCustomPresets(): Record<string, AgentConfig> {
  if (!fs.existsSync(PRESETS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(PRESETS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Salva a configuracao atual como um novo preset customizado
 */
export function saveCustomPreset(name: string, config: AgentConfig): void {
  const presets = listCustomPresets();
  presets[name] = config;
  fs.writeFileSync(PRESETS_PATH, JSON.stringify(presets, null, 2), 'utf-8');
}

/**
 * Deleta um preset customizado
 */
export function deleteCustomPreset(name: string): void {
  const presets = listCustomPresets();
  delete presets[name];
  fs.writeFileSync(PRESETS_PATH, JSON.stringify(presets, null, 2), 'utf-8');
}
