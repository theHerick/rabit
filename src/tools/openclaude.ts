import { spawn } from 'child_process';

export interface OpenclaudeOptions {
  model: string;
  prompt: string;
  systemPrompt?: string;
  allowedTools?: string[];
  workDir?: string;
  dangerouslySkipPermissions?: boolean;
  useLocalAuth?: boolean;
  timeoutMs?: number;
}

export interface OpenclaudeResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export function errorReport(r: OpenclaudeResult): string {
  const parts: string[] = [];
  parts.push(`exitCode=${r.exitCode}${r.timedOut ? ' (timeout)' : ''}`);
  if (r.stdout.trim()) parts.push('stdout:\n' + r.stdout.trim());
  if (r.stderr.trim()) parts.push('stderr:\n' + r.stderr.trim());
  return parts.join('\n');
}

const DEFAULT_TIMEOUT_MS = 15 * 60_000;

export async function runOpenclaude(opts: OpenclaudeOptions): Promise<OpenclaudeResult> {
  const args = ['--print', '--model', opts.model];
  if (opts.systemPrompt) {
    args.push('--append-system-prompt', opts.systemPrompt);
  }
  if (opts.allowedTools && opts.allowedTools.length > 0) {
    args.push('--allowedTools', opts.allowedTools.join(' '));
  }
  if (opts.workDir) {
    args.push('--add-dir', opts.workDir);
  }
  if (opts.dangerouslySkipPermissions !== false) {
    args.push('--dangerously-skip-permissions');
  }
  args.push(opts.prompt);

  const env = opts.useLocalAuth
    ? { ...process.env }
    : {
        ...process.env,
        ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || 'http://localhost:11434',
        ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN || 'ollama',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || ''
      };

  return new Promise((resolve) => {
    const child = spawn('claude', args, {
      cwd: opts.workDir ?? process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf-8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf-8');
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        stdout,
        stderr: stderr + '\n' + (err.message || String(err)),
        exitCode: -1,
        timedOut
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? -1,
        timedOut
      });
    });
  });
}

export async function openclaudeAvailable(): Promise<boolean> {
  const result = await new Promise<boolean>((resolve) => {
    const child = spawn('claude', ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve(false);
    }, 5_000);
    child.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
  return result;
}

export async function smokeTestModel(model: string, timeoutMs = 45_000): Promise<{ ok: boolean; invalidModel: boolean; error?: string }> {
  const result = await runOpenclaude({
    model,
    prompt: 'ping',
    dangerouslySkipPermissions: true,
    timeoutMs
  });
  if (result.exitCode === 0 && !result.timedOut) {
    return { ok: true, invalidModel: false };
  }
  const combined = (result.stdout + '\n' + result.stderr).toLowerCase();
  const invalidModel = combined.includes('invalid model name') ||
    combined.includes('it may not exist') ||
    combined.includes('"message":"model');
  return {
    ok: false,
    invalidModel,
    error: errorReport(result)
  };
}
