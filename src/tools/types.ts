/**
 * Shared type definitions across the Cllama Core system.
 */

export type WorkerModel = 'qwen3.6' | 'qwen3.5' | 'qwen3.6:latest' | 'qwen3.5:latest';
export type EffortLevel = 'Speed' | 'Deep';

export interface WorkerSpec {
  id: string;
  model: WorkerModel;
  effort: EffortLevel;
  role: string;
  task: string;
  dependencies?: string[];
}

export interface ArchitectPlan {
  reasoning: string;
  workers_to_spawn: WorkerSpec[];
  merge_strategy: 'concat' | 'layered' | 'single';
  output_language: string;
}

export interface WorkerOutput {
  workerId: string;
  role: string;
  content: string;
  language: string;
}

export interface AuditorReport {
  role: 'syntax' | 'logic' | 'security';
  status: 'OK' | 'REJECT';
  reason: string;
}

export interface ConsensusResult {
  approved: boolean;
  reports: AuditorReport[];
}

export interface Skill {
  id: string;
  name: string;
  prompt: string;
  code: string;
  language: string;
  vector: number[];
  createdAt: string;
  usageCount: number;
}

export interface MemoryRecord {
  id: string;
  category: 'command' | 'file-read' | 'decision' | 'observation' | 'summary';
  content: string;
  vector: number[];
  timestamp: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionData {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  messages: SessionMessage[];
}

export interface SessionMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export interface HealingAttempt {
  attempt: number;
  code: string;
  error: string;
}
