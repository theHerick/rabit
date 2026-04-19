/**
 * Claude CLI provider.
 * Usa o binario `claude` local (Claude Code) via `claude -p --output-format json`.
 * - Sem API key — usa o login existente do Claude Code
 * - --json-schema: valida JSON nativamente, sem parsing manual fragil
 * - --effort: ajusta qualidade/velocidade por tipo de tarefa
 * - --output-format json: extrai `result` do JSON em vez de parsear texto livre
 */

import { spawn } from 'child_process';
import { LLMProvider, CompleteOptions } from './types';
import { getParam } from '../config/agents';
// CAVEMAN_SUFFIX removed;

interface ClaudeJsonResult {
  type: string;
  subtype?: string;
  result?: string;
  is_error?: boolean;
  structured_output?: unknown;
}

async function spawnClaude(args: string[], prompt: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // Manda o prompt via stdin em vez de argumento (evita problemas com tamanho e escaping)
    const child = spawn('claude', [...args, '-p', '--output-format', 'json', '--no-session-persistence'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`claude-cli: timeout apos ${timeoutMs / 1000}s`));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf-8'); });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`claude-cli: falha ao spawnar processo — ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const detail = (stderr || stdout).trim().slice(0, 200);
        reject(new Error(`claude-cli: exitCode=${code} — ${detail}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim()) as ClaudeJsonResult;
        if (parsed.is_error) {
          reject(new Error(`claude-cli: erro da API — ${parsed.result ?? 'sem detalhe'}`));
          return;
        }
        // --json-schema coloca o resultado em structured_output (nao em result)
        if (parsed.structured_output !== undefined) {
          resolve(JSON.stringify(parsed.structured_output));
          return;
        }
        resolve(parsed.result ?? '');
      } catch {
        // Fallback: retorna stdout bruto se nao for JSON valido
        resolve(stdout.trim());
      }
    });

    // Envia prompt via stdin e fecha
    child.stdin.write(prompt, 'utf-8');
    child.stdin.end();
  });
}

export const claudecliProvider: LLMProvider = {
  name: 'claude-cli',
  async complete(opts: CompleteOptions): Promise<string> {
    const timeoutMs = (getParam('agentTimeoutMs') as number) ?? 300_000;

    const args: string[] = ['--model', opts.model, '--dangerously-skip-permissions'];

    if (opts.system?.trim()) {
      args.push('--append-system-prompt', opts.system.trim());
    }

    // JSON schema nativo e muito mais confiavel que pedir JSON no prompt
    if (opts.jsonSchema) {
      args.push('--json-schema', JSON.stringify(opts.jsonSchema));
    } else if (opts.format === 'json') {
      // Fallback: schema generico que forca objeto JSON
      args.push('--json-schema', JSON.stringify({ type: 'object' }));
    }

    if (opts.effort) {
      args.push('--effort', opts.effort);
    }

    return spawnClaude(args, opts.prompt, timeoutMs);
  }
};
