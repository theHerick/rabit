/**
 * LLM Provider interface.
 * Abstracts the model backend so agents do not care whether the call goes
 * to a local Ollama, to Anthropic API, to OpenAI, etc. Every provider must
 * honour the same CompleteOptions contract so agents are drop-in portable.
 */

export type ProviderName = 'ollama' | 'anthropic' | 'claude-cli';

export interface CompleteOptions {
  model: string;
  system?: string;
  prompt: string;
  format?: 'json' | 'text';
  temperature?: number;
  numCtx?: number;
  /** JSON Schema para validacao nativa (suportado pelo claude-cli via --json-schema). */
  jsonSchema?: Record<string, unknown>;
  /** Nivel de esforco/qualidade (suportado pelo claude-cli via --effort). */
  effort?: 'low' | 'medium' | 'high';
}

export interface LLMProvider {
  name: ProviderName;
  complete(opts: CompleteOptions): Promise<string>;
}

export interface RoleBinding {
  provider: ProviderName;
  model: string;
  /** Esforco para claude-cli (--effort). Se definido, sobrescreve o padrao do agente. */
  effort?: 'low' | 'medium' | 'high';
}
