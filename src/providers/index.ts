/**
 * Provider registry and dispatch.
 */

import { LLMProvider, ProviderName, RoleBinding, CompleteOptions } from './types';
import { ollamaProvider } from './ollama';
import { anthropicProvider } from './anthropic';
import { claudecliProvider } from './claudecli';

export * from './types';

const providers: Record<ProviderName, LLMProvider> = {
  ollama: ollamaProvider,
  anthropic: anthropicProvider,
  'claude-cli': claudecliProvider
};

export function getProvider(name: ProviderName): LLMProvider {
  const p = providers[name];
  if (!p) throw new Error(`provider desconhecido: ${name}`);
  return p;
}

export async function completeFor(binding: RoleBinding, opts: Omit<CompleteOptions, 'model'>): Promise<string> {
  const provider = getProvider(binding.provider);
  // binding.effort wins over the agent's hardcoded default (user config takes priority)
  const effort = binding.effort ?? opts.effort;
  return provider.complete({ ...opts, model: binding.model, effort });
}

export const PROVIDER_NAMES: ReadonlyArray<ProviderName> = ['ollama', 'claude-cli'];
