/**
 * Execution Reviewer
 * Runs code and validates if it works
 * npm test, npm build, etc
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { say } from '../terminal/voices';

export interface ReviewResult {
  passed: boolean;
  issues?: string[];
  stdout?: string;
  stderr?: string;
}

/**
 * Runs code and validates
 */
export async function reviewAndExecuteCode(projectPath: string): Promise<ReviewResult> {
  say('reviewer', 'running tests...');

  const issues: string[] = [];
  let allOutput = '';

  try {
    // Step 1: npm install
    say('reviewer', 'installing dependencies...');
    try {
      const output = execSync('npm install', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      allOutput += output;
    } catch (err) {
      issues.push(`npm install failed: ${err}`);
    }

    // Step 2: TypeScript compile (if present)
    if (fs.existsSync(path.join(projectPath, 'tsconfig.json'))) {
      say('reviewer', 'compiling TypeScript...');
      try {
        const output = execSync('npx tsc --noEmit', {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        allOutput += output;
      } catch (err) {
        const error = String(err).split('\n').slice(0, 3).join('\n');
        issues.push(`TypeScript compilation error: ${error}`);
      }
    }

    // Step 3: npm build
    if (hasScript(projectPath, 'build')) {
      say('reviewer', 'building...');
      try {
        const output = execSync('npm run build', {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 30000
        });
        allOutput += output;
      } catch (err) {
        const error = String(err).split('\n').slice(0, 3).join('\n');
        issues.push(`Build failed: ${error}`);
      }
    }

    // Step 4: npm test
    if (hasScript(projectPath, 'test')) {
      say('reviewer', 'running tests...');
      try {
        const output = execSync('npm test', {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 30000
        });
        allOutput += output;
      } catch (err) {
        const error = String(err).split('\n').slice(0, 5).join('\n');
        issues.push(`Tests failed: ${error}`);
      }
    }

    // Step 5: Check import integrity (static analysis)
    const importIssues = checkImports(projectPath);
    issues.push(...importIssues);

    const passed = issues.length === 0;
    
    if (passed) {
      say('reviewer', '✓ All passed');
    } else {
      say('reviewer', `✗ ${issues.length} issue(s) found`);
    }

    // Log observation
    await remember({
      category: 'observation',
      content: passed 
        ? `Review passed for project ${path.basename(projectPath)}`
        : `Review failed for project ${path.basename(projectPath)} with ${issues.length} issues: ${issues.slice(0, 3).join(', ')}`,
      metadata: { projectId: path.basename(projectPath), status: 'reviewed', passed, issueCount: issues.length }
    });

    return {
      passed,
      issues: issues.length > 0 ? issues : undefined,
      stdout: allOutput
    };
  } catch (err) {
    say('reviewer', '✗ critical error');
    
    // Log critical failure
    await remember({
      category: 'observation',
      content: `Critical error during review of project ${path.basename(projectPath)}: ${String(err)}`,
      metadata: { projectId: path.basename(projectPath), status: 'review_error', error: String(err) }
    });

    return {
      passed: false,
      issues: [String(err)],
      stdout: allOutput
    };
  }
}

import { remember } from '../db/memory';

/**
 * Checks if script exists in package.json
 */
function hasScript(projectPath: string, scriptName: string): boolean {
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    return !!(pkg.scripts && pkg.scripts[scriptName]);
  } catch {
    return false;
  }
}

/**
 * Check import integrity (quick static analysis)
 */
function checkImports(projectPath: string): string[] {
  const issues: string[] = [];

  try {
    // Scan all TypeScript files
    const tsFiles = scanTsFiles(projectPath);
    const availableFiles = new Set(tsFiles);

    for (const file of tsFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Look for imports: import { x } from 'file'
      const importPattern = /from\s+['"]([^'"]+)['"]/g;
      let match;

      while ((match = importPattern.exec(content)) !== null) {
        let importPath = match[1];
        
        // Skip: node_modules, externals
        if (importPath.startsWith('.') || importPath.startsWith('@')) {
          // Resolve relative path
          const basePath = path.dirname(file);
          let resolved = path.resolve(basePath, importPath);
          
          // Add extensions
          for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts']) {
            const withExt = resolved + ext;
            if (availableFiles.has(withExt)) {
              resolved = withExt;
              break;
            }
          }

          if (!availableFiles.has(resolved)) {
            issues.push(`Import not found: "${importPath}" in ${path.relative(projectPath, file)}`);
          }
        }
      }
    }

    return issues;
  } catch (err) {
    return [`Error checking imports: ${err}`];
  }
}

/**
 * Recursive scan for TypeScript files
 */
function scanTsFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip node_modules, dist, etc
      if (['node_modules', 'dist', 'build', '.git', '.next'].includes(entry.name)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...scanTsFiles(fullPath));
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignore access errors
  }

  return files;
}
