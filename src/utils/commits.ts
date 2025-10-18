import { BumpType, CommitInfo } from '../adapters/core.js';
import { getBumpTypeForCommit, Config } from '../config/index.js';
import { maxBumpType } from '../semver/index.js';

/**
 * Calculate the overall bump type from a collection of commits.
 * Analyzes each commit and returns the highest bump type found.
 * 
 * @param commits Array of commit information to analyze
 * @param config Configuration containing commit type mappings and rules
 * @returns The highest bump type found across all commits
 */
export function calculateBumpFromCommits(commits: CommitInfo[], config: Config): BumpType {
  const bumpTypes: BumpType[] = [];

  for (const commit of commits) {
    const bumpType = getBumpTypeForCommit(commit.type, commit.breaking, config);
    if (bumpType !== 'none') {
      bumpTypes.push(bumpType);
    }
  }

  return maxBumpType(bumpTypes);
}
