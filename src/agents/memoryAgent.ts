/**
 * Memory Agent
 * Responsible for compressing raw observations into semantic summaries.
 */

import { completeFor } from '../providers';
import { getBinding } from '../config/agents';
import { say } from '../terminal/voices';
import { MemoryRecord } from '../tools/types';
import { remember } from '../db/memory';

const SUMMARIZER_SYSTEM_PROMPT = `You are the Ra-Bit Memory Agent.
Your task is to analyze a list of recent "observations" from a coding session and compress them into a concise "Semantic Summary".

A good summary should:
1. Capture key decisions (architecture, tech stack chosen).
2. Note significant file changes or new components created.
3. Record any major blockers encountered and how they were resolved.
4. Be brief enough to be injected into future prompts without wasting many tokens.

Format your response as a clear, bulleted summary.`;

/**
 * Summarize a list of observations.
 */
export async function summarizeObservations(
  observations: MemoryRecord[],
  projectId: string
): Promise<MemoryRecord | null> {
  if (observations.length === 0) return null;

  say('brain', `Compressing ${observations.length} observations into a semantic summary...`);

  const binding = getBinding('memoryAgent');
  
  const observationText = observations
    .map(o => `[${o.timestamp}] ${o.content}`)
    .join('\n---\n');

  const prompt = `Session Observations for Project ${projectId}:\n\n${observationText}\n\nProvide a concise semantic summary of the work done and decisions made:`;

  try {
    const summaryContent = await completeFor(binding, {
      system: SUMMARIZER_SYSTEM_PROMPT,
      prompt,
      temperature: 0.1,
      effort: 'medium'
    });

    const summary = await remember({
      category: 'summary',
      content: summaryContent,
      metadata: {
        projectId,
        originalObservations: observations.map(o => o.id),
        type: 'session_summary'
      }
    });

    say('brain', `✓ Summary created [${summary.id}]`);
    return summary;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    say('brain', `✗ Failed to summarize: ${msg}`);
    return null;
  }
}
