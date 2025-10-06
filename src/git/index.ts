import { execSync } from 'child_process';
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
    const lastTag = getLastTagForModule(modulePath, { cwd });
    
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
  
  let gitCommand = `git log --format="%H%n%s%n%b%n---COMMIT-END---" ${range}`;
  
  if (pathFilter) {
    gitCommand += ` -- ${pathFilter}`;
  }
  
  try {
    const output = execSync(gitCommand, { 
      cwd, 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'] 
    });
    
    return parseGitLog(output);
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
export function getLastTagForModule(
  modulePath: string,
  options: GitOptions = {}
): string | null {
  const cwd = options.cwd || process.cwd();
  
  try {
    // Try to find module-specific tags first (e.g., module@1.0.0)
    const moduleTagPattern = getModuleTagPattern(modulePath);
    
    let output = execSync(
      `git tag -l "${moduleTagPattern}" --sort=-version:refname`,
      { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    
    if (output.trim()) {
      return output.trim().split('\n')[0];
    }
    
    // Fallback to general tags
    output = execSync(
      'git describe --tags --abbrev=0 HEAD',
      { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    
    return output.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Get all tags in the repository
 */
export function getAllTags(options: GitOptions = {}): GitTag[] {
  const cwd = options.cwd || process.cwd();
  
  try {
    const output = execSync(
      'git tag -l --format="%(refname:short) %(objectname)"',
      { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    
    return output
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
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
export function createTag(
  tagName: string,
  message: string,
  options: GitOptions = {}
): void {
  const cwd = options.cwd || process.cwd();
  
  try {
    execSync(
      `git tag -a "${tagName}" -m "${message}"`,
      { cwd, stdio: 'inherit' }
    );
  } catch (error) {
    throw new Error(`Failed to create tag ${tagName}: ${error}`);
  }
}

/**
 * Push tags to remote
 */
export function pushTags(options: GitOptions = {}): void {
  const cwd = options.cwd || process.cwd();
  
  try {
    execSync('git push --tags', { cwd, stdio: 'inherit' });
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
export function isWorkingDirectoryClean(options: GitOptions = {}): boolean {
  const cwd = options.cwd || process.cwd();
  
  try {
    const output = execSync('git status --porcelain', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    return output.trim() === '';
  } catch (error) {
    return false;
  }
}

/**
 * Get the current branch name
 */
export function getCurrentBranch(options: GitOptions = {}): string {
  const cwd = options.cwd || process.cwd();
  
  try {
    const output = execSync('git branch --show-current', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    return output.trim();
  } catch (error) {
    throw new Error(`Failed to get current branch: ${error}`);
  }
}