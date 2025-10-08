import { getExecOutput, exec } from '@actions/exec';
import { CommitInfo } from '../adapters/core.js';
import * as conventionalCommitsParser from 'conventional-commits-parser';
import * as core from '@actions/core';

export interface GitTag {
  name: string;
  hash: string;
  module?: string;
  version?: string;
}

export interface GitOptions {
  cwd?: string;
}

/**
 * Get commits since the last tag for a specific module
 */
export async function getCommitsSinceLastTag(
  modulePath: string,
  options: GitOptions = {}
): Promise<CommitInfo[]> {
  const cwd = options.cwd || process.cwd();
  
  try {
    // Find the last tag for this module
    const lastTag = await getLastTagForModule(modulePath, { cwd });
    
    // Get commits since that tag
    const range = lastTag ? `${lastTag}..HEAD` : '';
    return getCommitsInRange(range, modulePath, { cwd });
  } catch (error) {
    // If no tags found, get all commits
    return getCommitsInRange('', modulePath, { cwd });
  }
}

/**
 * Get commits in a specific range, optionally filtered by path
 */
export async function getCommitsInRange(
  range: string,
  pathFilter?: string,
  options: GitOptions = {}
): Promise<CommitInfo[]> {
  const cwd = options.cwd || process.cwd();

  core.info(`cwd: ${cwd}, range: ${range}, pathFilter: ${pathFilter}`);
  
  try {
    const { stdout } = await getExecOutput('git', ['log', '--format=%H%n%s%n%b%n---COMMIT-END---', range, ...(pathFilter ? ['--', pathFilter] : [])], {
      cwd,
      //silent: true
    });
    
    return parseGitLog(stdout);
  } catch (error) {
    core.warning(`Warning: Failed to get git commits: ${error}`);
    return [];
  }
}

/**
 * Parse git log output into CommitInfo objects
 */
function parseGitLog(output: string): CommitInfo[] {
  if (!output.trim()) {
    return [];
  }
  
  const commits: CommitInfo[] = [];
  const commitBlocks = output.split('---COMMIT-END---').filter(block => block.trim());
  
  for (const block of commitBlocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;
    
    const hash = lines[0];
    const subject = lines[1];
    const body = lines.slice(2).join('\n').trim();
    
    try {
      const parsed = conventionalCommitsParser.sync(subject + '\n\n' + body);
      
      commits.push({
        hash,
        type: parsed.type || 'unknown',
        scope: parsed.scope || undefined,
        subject: parsed.subject || subject,
        body: body || undefined,
        breaking: parsed.notes?.some(note => note.title === 'BREAKING CHANGE') || false,
      });
    } catch (error) {
      // If parsing fails, treat as unknown commit type
      commits.push({
        hash,
        type: 'unknown',
        subject,
        body: body || undefined,
        breaking: false,
      });
    }
  }
  
  return commits;
}

/**
 * Get the last tag for a specific module
 */
export async function getLastTagForModule(
  modulePath: string,
  options: GitOptions = {}
): Promise<string | null> {
  const cwd = options.cwd || process.cwd();
  
  try {
    // Try to find module-specific tags first (e.g., module@1.0.0)
    const moduleTagPattern = getModuleTagPattern(modulePath);
    
    const { stdout } = await getExecOutput('git', ['tag', '-l', moduleTagPattern, '--sort=-version:refname'], {
      cwd,
      silent: true
    });
    
    if (stdout.trim()) {
      return stdout.trim().split('\n')[0];
    }
    
    // Fallback to general tags
    const { stdout: fallbackOutput } = await getExecOutput('git', ['describe', '--tags', '--abbrev=0', 'HEAD'], {
      cwd,
      silent: true
    });
    
    return fallbackOutput.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Get all tags in the repository
 */
export async function getAllTags(options: GitOptions = {}): Promise<GitTag[]> {
  const cwd = options.cwd || process.cwd();
  
  try {
    const { stdout } = await getExecOutput('git', ['tag', '-l', '--format=%(refname:short) %(objectname)'], {
      cwd,
      silent: true
    });
    
    return stdout
      .trim()
      .split('\n')
      .filter((line: string) => line.trim())
      .map((line: string) => {
        const [name, hash] = line.split(' ');
        const { module, version } = parseTagName(name);
        
        return {
          name,
          hash,
          module,
          version,
        };
      });
  } catch (error) {
    return [];
  }
}

/**
 * Create a git tag
 */
export async function createTag(
  tagName: string,
  message: string,
  options: GitOptions = {}
): Promise<void> {
  const cwd = options.cwd || process.cwd();
  
  try {
    await exec('git', ['tag', '-a', tagName, '-m', message], {
      cwd
    });
  } catch (error) {
    throw new Error(`Failed to create tag ${tagName}: ${error}`);
  }
}

/**
 * Push tags to remote
 */
export async function pushTags(options: GitOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  
  try {
    await exec('git', ['push', '--tags'], { cwd });
  } catch (error) {
    throw new Error(`Failed to push tags: ${error}`);
  }
}

/**
 * Get module name from path for tag naming
 */
function getModuleTagPattern(modulePath: string): string {
  const moduleName = modulePath.split('/').pop() || 'root';
  return `${moduleName}@*`;
}

/**
 * Parse a tag name to extract module and version
 */
function parseTagName(tagName: string): { module?: string; version?: string } {
  const match = tagName.match(/^(.+)@(.+)$/);
  
  if (match) {
    return {
      module: match[1],
      version: match[2],
    };
  }
  
  // Check if it's just a version
  const versionMatch = tagName.match(/^v?(\d+\.\d+\.\d+.*)$/);
  if (versionMatch) {
    return {
      version: versionMatch[1],
    };
  }
  
  return {};
}

/**
 * Check if the working directory is clean
 */
export async function isWorkingDirectoryClean(options: GitOptions = {}): Promise<boolean> {
  const cwd = options.cwd || process.cwd();
  
  try {
    const { stdout } = await getExecOutput('git', ['status', '--porcelain'], {
      cwd,
      silent: true
    });
    
    return stdout.trim() === '';
  } catch (error) {
    return false;
  }
}

/**
 * Get the current branch name
 */
export async function getCurrentBranch(options: GitOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();
  
  try {
    const { stdout } = await getExecOutput('git', ['branch', '--show-current'], {
      cwd,
      silent: true
    });
    
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get current branch: ${error}`);
  }
}