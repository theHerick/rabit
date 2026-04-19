import { AgentRoleKey } from '../config/agents';

export type CoderType = 'juniorCoder' | 'seniorCoder' | 'coder' | 'designCoder';

export function isLocalCoder(coderType: CoderType | AgentRoleKey): boolean {
    return coderType === 'juniorCoder' || coderType === 'coder';
}

export function isClaudeCoder(coderType: CoderType | AgentRoleKey): boolean {
    return coderType === 'seniorCoder';
}

export function detectModelType(provider: string, model: string): 'ollama' | 'claude' | 'unknown' {
    if (provider.toLowerCase() === 'ollama' || provider.toLowerCase() === 'local') {
        return 'ollama';
    }
    if (provider.toLowerCase() === 'anthropic' || model.toLowerCase().includes('claude')) {
        return 'claude';
    }
    return 'unknown';
}

export function getAdaptivePartitionerPrompt(architecture: string, coderCount: number, modelType: 'ollama' | 'claude'): string {
    if (modelType === 'ollama') {
        return `You are a task partitioner. Analyze the architecture and distribute files across ${coderCount} coders.

# Architecture
\`\`\`
${architecture}
\`\`\`

# Task Distribution Rules
1. Extract all files mentioned in the architecture
2. Distribute them evenly among ${coderCount} coders
3. Group related files together (e.g., utils with their consumers)
4. Ensure dependencies flow left-to-right (coder1 → coder2 → coder3)
5. Each coder should get roughly equal work

# Output Format
Return ONLY valid JSON:
{
  "tasks": [
    {
      "coderId": 1,
      "files": ["src/utils.ts", "src/helpers.ts"],
      "description": "Utility functions and helpers"
    },
    {
      "coderId": 2,
      "files": ["src/api.ts"],
      "description": "API endpoints"
    }
  ]
}

Extract and partition the architecture files now:`;
    }
    // Claude (concise)
    return `Partition these files across ${coderCount} coders. Extract all files, distribute evenly, group related.

\`\`\`
${architecture}
\`\`\`

Return JSON:
{
  "tasks": [
    { "coderId": 1, "files": ["src/a.ts", "src/b.ts"], "description": "..." },
    { "coderId": 2, "files": ["src/c.ts"], "description": "..." }
  ]
}`;
}

export function getCoderSystemPrompt(coderType: CoderType): string {
    if (coderType === 'seniorCoder') {
        return `You are a code generator. Implement ONLY what is specified in the architecture. Do not invent files, endpoints, or features. Return valid JSON.`;
    }
    return `You are a professional code generator. Your task is to implement TypeScript/JavaScript files EXACTLY as specified in the architecture.

CRITICAL RULES:
1. Follow the architecture specification EXACTLY - do not invent or extend
2. Implement ONLY the files and features mentioned
3. Do not add extra functions, parameters, or features not in the spec
4. Generate clean, production-ready code
5. Include proper error handling
6. Use TypeScript types where applicable
7. Add comments for complex logic
8. Ensure all imports are correct and resolvable

RETURN ONLY JSON:
{
  "files": {
    "path/to/file.ts": "file content here...",
    "path/to/file2.ts": "file content here..."
  }
}`;
}

export function getCoderTaskPrompt(fileList: string, architecture: string, coderType: CoderType): string {
    if (coderType === 'seniorCoder') {
        return `Architecture:
\`\`\`
${architecture}
\`\`\`

Implement these files (nothing more):
${fileList}

Return JSON only.`;
    }
    return `# Architecture Specification
\`\`\`
${architecture}
\`\`\`

# Your Task
Implement ONLY these files (no more, no less):
${fileList}

# Implementation Requirements
1. Each file should be complete and functional
2. Follow TypeScript best practices
3. Import ONLY what you need from the specified architecture
4. Add JSDoc comments for public functions
5. Handle errors gracefully
6. Keep code clean and maintainable

# DO NOT:
- Add extra files not listed above
- Add extra functions not in the architecture
- Add extra endpoints, features, or parameters
- Add test files or mock data

# EXAMPLE OUTPUT FORMAT:
{
  "files": {
    "src/index.ts": "export function main() { /* implementation */ }",
    "src/config.ts": "export const config = { /* ... */ };"
  }
}

# Now implement:`;
}
