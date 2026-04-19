import { Ollama } from 'ollama';

export const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
export const NO_EMOJI_DIRECTIVE = 'Do not use emojis in your response. Output strictly in raw text or code.';

export const REQUIRED_MODELS = [
    'qwen3.6',
    'llama3',
    'llama3.1:8b',
    'deepseek-coder-v2',
    'qwen3.5',
    'qwen2.5-coder:7b',
    'nomic-embed-text'
];

export const AUDITOR_MODEL = 'qwen3.6:latest';

let clientSingleton: Ollama | null = null;

export function getClient(): Ollama {
    if (!clientSingleton) {
        clientSingleton = new Ollama({ host: OLLAMA_HOST });
    }
    return clientSingleton;
}

function composeSystem(system?: string): string {
    const base = system && system.trim().length > 0 ? system.trim() : '';
    if (base.length === 0) return NO_EMOJI_DIRECTIVE;
    return `${base}\n\n${NO_EMOJI_DIRECTIVE}`;
}

export async function generate(opts: {
    model: string;
    prompt: string;
    system?: string;
    format?: 'json';
    temperature?: number;
    numCtx?: number;
}): Promise<string> {
    const client = getClient();
    const response = await client.generate({
        model: opts.model,
        prompt: opts.prompt,
        system: composeSystem(opts.system),
        stream: false,
        format: opts.format,
        options: {
            temperature: opts.temperature ?? 0.2,
            num_ctx: opts.numCtx ?? 8192
        }
    });
    return response.response;
}

export async function embed(text: string): Promise<number[]> {
    const client = getClient();
    const response = await client.embeddings({
        model: 'nomic-embed-text',
        prompt: text
    });
    return response.embedding;
}

export async function listModels(): Promise<string[]> {
    const client = getClient();
    const res = await client.list();
    return res.models.map((m) => m.name);
}

export async function getAvailableModels(): Promise<string[]> {
    return listModels();
}

export async function pullModel(name: string, onProgress: (status: string, completed?: number, total?: number) => void): Promise<void> {
    const client = getClient();
    const stream = await client.pull({ model: name, stream: true });
    for await (const chunk of stream) {
        onProgress(chunk.status || 'downloading', chunk.completed, chunk.total);
    }
}
