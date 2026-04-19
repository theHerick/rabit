/**
 * Ollama provider.
 * Thin adapter over the existing ollama.generate() wrapper. JSON mode uses
 * Ollama's native format=json for guaranteed valid JSON output.
 */

import { generate } from '../tools/ollama';
import { LLMProvider, CompleteOptions } from './types';

export const ollamaProvider: LLMProvider = {
  name: 'ollama',
  async complete(opts: CompleteOptions): Promise<string> {
    return generate({
      model: opts.model,
      system: opts.system,
      prompt: opts.prompt,
      temperature: opts.temperature ?? 0.2,
      numCtx: opts.numCtx ?? 8192,
      format: opts.format === 'json' ? 'json' : undefined
    });
  }
};
