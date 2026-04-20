/**
 * Partitioner Agent (Architect)
 * Reads architecture.md provided by the user
 * Decides: which coder does which file
 */

import * as fs from 'fs';
import * as path from 'path';
import { completeFor } from '../providers';
import { getBinding, getCoderCount } from '../config/agents';
import { say } from '../terminal/voices';
import { detectModelType, getAdaptivePartitionerPrompt } from '../tools/promptAdaptation';
import { remember } from '../db/memory';

export interface CoderTask {
  coderId: number;
  coderType: 'juniorCoder' | 'seniorCoder' | 'coder'; // Coder type
  files: string[];
  description: string;
}

export interface PartitionPlan {
  projectName: string;
  architecture: string; // architecture.md content
  tasks: CoderTask[];
  totalFiles: number;
}

/**
 * Reads architecture.md and partitions between coders
 */
export async function partitionArchitecture(
  architectureFile: string,
  coderCount: 1 | 2 | 3
): Promise<PartitionPlan> {
  if (!fs.existsSync(architectureFile)) {
    throw new Error(`Architecture file not found: ${architectureFile}`);
  }

  const architecture = fs.readFileSync(architectureFile, 'utf-8');
  
  // Extract file list from architecture
  const files = extractFilesFromArchitecture(architecture);
  
  say('architect', `partitioning ${files.length} file(s) between ${coderCount} coder(s)...`);

  if (coderCount === 1) {
    // Everything to one coder (seniorCoder by default)
    return {
      projectName: 'project',
      architecture,
      tasks: [
        {
          coderId: 1,
          coderType: 'seniorCoder',
          files,
          description: 'Implement all files as per architecture'
        }
      ],
      totalFiles: files.length
    };
  }

  // Use AI to partition intelligently
  const architectBinding = getBinding('architect');
  const modelType = detectModelType(architectBinding.provider, architectBinding.model);
  
  const prompt = getAdaptivePartitionerPrompt(architecture, coderCount, modelType === "claude" ? "claude" : "ollama");

  say('architect', `partitioner: ${modelType} (${architectBinding.provider}/${architectBinding.model})`);

  const raw = await completeFor(architectBinding, {
    system: 'You are a task partitioner. Distribute files among coders based on the provided architecture.',
    prompt,
    temperature: 0,
    format: 'json',
    numCtx: modelType === 'ollama' ? 6144 : 4096,
    effort: 'low', // Very fast
    useMemory: true
  });

  const parsed = parsePartitionResponse(raw, coderCount, files);

  // Log observation
  await remember({
    category: 'observation',
    content: `Architect partitioned project into ${parsed.length} tasks for ${coderCount} coders. Plan: ${parsed.map(t => `${t.coderType}(${t.files.length} files)`).join(', ')}`,
    metadata: { status: 'partitioned', taskCount: parsed.length, coderCount }
  });

  say('architect', `partitioned: ${parsed.map(t => `Coder${t.coderId}(${t.files.length})`).join(' | ')}`);

  return {
    projectName: 'project',
    architecture,
    tasks: parsed,
    totalFiles: files.length
  };
}

/**
 * Extract file list from architecture
 */
function extractFilesFromArchitecture(architecture: string): string[] {
  const files: Set<string> = new Set();

  // Patterns: `src/main.ts`, `- src/utils.ts`, etc
  const patterns = [
    /`([^`]*\.[a-z]+)`/g,           // `filename.ext`
    /^-\s+`?([^\s`]+\.[a-z]+)`?/gm, // - filename.ext
    /^-\s+([^\s]+\.[a-z]+)/gm,      // - filename.ext (without backticks)
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(architecture)) !== null) {
      const file = match[1].trim();
      if (file && !file.includes(' ') && file.includes('.')) {
        files.add(file);
      }
    }
  }

  return Array.from(files).filter(f => 
    !f.includes('..') && 
    !f.endsWith('/') &&
    f.length < 100
  );
}

/**
 * Parse partitioning response
 */
function parsePartitionResponse(
  raw: string,
  coderCount: number,
  allFiles: string[]
): CoderTask[] {
  try {
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    const json = raw.substring(first, last + 1);
    const parsed = JSON.parse(json) as { tasks?: unknown[] };

    if (!Array.isArray(parsed.tasks)) {
      return fallbackPartition(coderCount, allFiles);
    }

    const tasks: CoderTask[] = [];
    const assigned = new Set<string>();

    for (const task of parsed.tasks) {
      if (!task || typeof task !== 'object') continue;
      
      const t = task as { coderId?: number; files?: unknown[]; description?: string };
      const coderId = typeof t.coderId === 'number' ? t.coderId : 1;
      const files = Array.isArray(t.files) 
        ? (t.files as string[]).filter(f => typeof f === 'string')
        : [];
      const description = typeof t.description === 'string' ? t.description : 'Implement as per architecture';

      if (files.length > 0) {
        // Determine coder type based on coderId and coderCount
        const coderType = getCoderTypeForId(coderId, coderCount);
        tasks.push({ coderId, coderType, files, description });
        files.forEach(f => assigned.add(f));
      }
    }

    // If any files remain, add them to the last coder
    const missing = allFiles.filter(f => !assigned.has(f));
    if (missing.length > 0 && tasks.length > 0) {
      tasks[tasks.length - 1].files.push(...missing);
    }

    return tasks.length > 0 ? tasks : fallbackPartition(coderCount, allFiles);
  } catch {
    return fallbackPartition(coderCount, allFiles);
  }
}

/**
 * Default partitioning if AI fails
 */
function fallbackPartition(coderCount: number, files: string[]): CoderTask[] {
  const filesPerCoder = Math.ceil(files.length / coderCount);
  const tasks: CoderTask[] = [];

  for (let i = 0; i < coderCount; i++) {
    const start = i * filesPerCoder;
    const end = start + filesPerCoder;
    const coderFiles = files.slice(start, end);

    if (coderFiles.length > 0) {
      const coderType = getCoderTypeForId(i + 1, coderCount);
      tasks.push({
        coderId: i + 1,
        coderType,
        files: coderFiles,
        description: `Implement files: ${coderFiles.join(', ')}`
      });
    }
  }

  return tasks;
}

/**
 * Determine coder type based on coderId and total coder count
 * Odd coders (1, 3) → juniorCoder (local, can handle long prompts)
 * Even coders (2) → seniorCoder (Claude, need concise prompts)
 * With 1 coder → seniorCoder
 */
function getCoderTypeForId(coderId: number, coderCount: number): 'juniorCoder' | 'seniorCoder' | 'coder' {
  if (coderCount === 1) return 'seniorCoder';
  if (coderCount === 2) return coderId === 1 ? 'juniorCoder' : 'seniorCoder';
  // coderCount === 3
  return coderId === 2 ? 'seniorCoder' : 'juniorCoder';
}
