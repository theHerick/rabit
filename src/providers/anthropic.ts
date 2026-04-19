/**
 * Anthropic provider.
 * Implemented against the public Messages API. Requires ANTHROPIC_API_KEY.
 * JSON mode is emulated by appending a strict instruction to the system prompt
 * and parsing the text response (Anthropic does not have a native JSON mode).
 *
 * Features:
 * - Prompt caching (beta): system prompts are cached to reduce latency and cost
 * - Dynamic max_tokens: derived from numCtx (capped per model tier)
 * - JSON prefill: assistant turn prefilled with "{" for reliable JSON output
 */

import { LLMProvider, CompleteOptions } from './types';
// CAVEMAN_SUFFIX removed;

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

interface AnthropicCacheControl {
  type: 'ephemeral';
}

interface AnthropicSystemBlock {
  type: 'text';
  text: string;
  cache_control?: AnthropicCacheControl;
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

// Modelos que suportam saída de 8k+ tokens
const HIGH_OUTPUT_MODELS = new Set([
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
]);

function resolveMaxTokens(model: string, numCtx?: number): number {
  const isHighOutput = HIGH_OUTPUT_MODELS.has(model) ||
    model.startsWith('claude-opus-4') ||
    model.startsWith('claude-sonnet-4') ||
    model.startsWith('claude-haiku-4') ||
    model.startsWith('claude-3-5');

  const cap = isHighOutput ? 8192 : 4096;

  if (!numCtx) return cap;
  // numCtx é context window total; output é ~40% disso como heurística
  const estimated = Math.round(numCtx * 0.4);
  return Math.min(Math.max(estimated, 512), cap);
}

export const anthropicProvider: LLMProvider = {
  name: 'anthropic',
  async complete(opts: CompleteOptions): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY nao configurada.\n' +
        '  Configure em: Menu principal > Configuracoes > Agentes > Usar Preset Claude\n' +
        '  Ou execute: export ANTHROPIC_API_KEY=sk-ant-...'
      );
    }

    const isJson = opts.format === 'json';
    const systemText =
      (opts.system ?? '') +
      (opts.system?.trim() ? opts.system.trim() + '\n\n' : '') +
      (isJson ? '\n\nResponda apenas com JSON valido. Sem markdown, sem prosa antes ou depois.' : '');

    const systemBlocks: AnthropicSystemBlock[] = systemText.trim()
      ? [{ type: 'text', text: systemText.trim(), cache_control: { type: 'ephemeral' } }]
      : [];

    // Prefill com "{" para forçar resposta JSON sem preâmbulo
    const messages: Array<{ role: string; content: string | AnthropicTextBlock[] }> = [
      { role: 'user', content: opts.prompt },
      ...(isJson ? [{ role: 'assistant', content: [{ type: 'text' as const, text: '{' }] }] : [])
    ];

    const body = {
      model: opts.model,
      max_tokens: resolveMaxTokens(opts.model, opts.numCtx),
      temperature: opts.temperature ?? 0.2,
      ...(systemBlocks.length > 0 ? { system: systemBlocks } : {}),
      messages
    };

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'anthropic-beta': 'prompt-caching-2024-07-31'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as AnthropicResponse;
    const parts = data.content.filter((c) => c.type === 'text').map((c) => c.text ?? '');
    const responseText = parts.join('');

    // Quando usamos prefill, precisamos juntar "{" com o restante
    return isJson ? '{' + responseText : responseText;
  }
};
