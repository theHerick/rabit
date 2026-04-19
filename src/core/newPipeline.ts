/**
 * New Simplified Pipeline
 * User Define Architecture → Partitioner → Coders → Reviewer → Organizer
 */

import chalk from 'chalk';
import { partitionArchitecture } from '../agents/partitioner';
import { codeWithMinimalContext } from '../agents/minimalCoder';
import { reviewAndExecuteCode } from '../agents/executionReviewer';
import { organizeAndFixProject } from '../agents/fixOrganizer';
import { say } from '../terminal/voices';
import { ProjectSession } from '../tools/projectSession';
import { updateStatus } from '../terminal/display';

export interface NewPipelineResult {
  ok: boolean;
  projectPath?: string;
  error?: string;
  review?: { passed: boolean; issues?: string[] };
}

/**
 * New flow: architecture.md → partition → code → review → organize
 */
export async function runNewPipeline(
  project: ProjectSession
): Promise<NewPipelineResult> {
  try {
    const coderCount = 3; // Configurable later

    // STEP 1: Partitioner reads architecture.md
    updateStatus('Partitioning');
    say('system', 'Reading architecture...');
    
    const partition = await partitionArchitecture(
      project.architectureFile,
      coderCount as 1 | 2 | 3
    );

    console.log(chalk.cyan('\n[ Partitioning Plan ]'));
    for (const task of partition.tasks) {
      console.log(
        chalk.yellow(`  Coder ${task.coderId}:`) +
        chalk.gray(` ${task.files.length} file(s) — ${task.description}`)
      );
    }
    console.log();

    // STEP 2: Coders implement (parallel)
    updateStatus('Coding');
    say('system', `Coding with ${partition.tasks.length} coder(s)...`);

    const coderResults = await Promise.all(
      partition.tasks.map((task) =>
        codeWithMinimalContext(
          task.coderId,
          task.coderType,
          task.files,
          partition.architecture,
          project.path
        )
      )
    );

    // Check for failures
    const failed = coderResults.filter(r => !r.ok);
    if (failed.length > 0) {
      return {
        ok: false,
        projectPath: project.path,
        error: `${failed.length} coder(s) failed`
      };
    }

    // STEP 3: Reviewer executes and validates
    updateStatus('Testing');
    say('system', 'Running tests...');

    const review = await reviewAndExecuteCode(project.path);

    if (!review.passed) {
      console.log(chalk.yellow('\n[ Issues Found ]'));
      (review.issues || []).forEach(issue => {
        console.log(chalk.red('  ✗ ') + issue);
      });

      // STEP 4a: If failed, organizer tries to fix
      updateStatus('Fixing');
      say('system', 'Trying to fix incompatibilities...');

      const fixed = await organizeAndFixProject(
        project.path,
        partition.architecture,
        review.issues || []
      );

      if (!fixed.ok) {
        return {
          ok: false,
          projectPath: project.path,
          error: 'Could not fix problems',
          review: { passed: false, issues: review.issues }
        };
      }

      // Re-test after fixes
      const reviewAfterFix = await reviewAndExecuteCode(project.path);
      return {
        ok: reviewAfterFix.passed,
        projectPath: project.path,
        review: reviewAfterFix
      };
    }

    // STEP 4b: If passed, organizer tidies up layout
    updateStatus('Organizing');
    say('system', 'Organizing final files...');

    await organizeAndFixProject(project.path, partition.architecture, []);

    return {
      ok: true,
      projectPath: project.path,
      review: { passed: true }
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
