import * as core from '@actions/core';
import { ModuleChangeResult } from './versionApplier.js';
import { 
  addChangedFiles,
  commitChanges,
  pushCommits,
  hasChangesToCommit,
  createTag,
  pushTags
} from '../git/index.js';

export type GitOperationsOptions = {
  pushChanges: boolean;
  pushTags: boolean;
  repoRoot: string;
  dryRun: boolean;
};

export class GitOperations {
  private options: GitOperationsOptions;

  constructor(options: GitOperationsOptions) {
    this.options = options;
  }

  async commitAndPushChanges(moduleChangeResults: ModuleChangeResult[]): Promise<void> {
    if (!this.options.pushChanges) {
      core.info('📦 Skipping commit and push (disabled by push-changes input)');
      return;
    }

    if (this.options.dryRun) {
      const commitMessage = this.createCommitMessage(moduleChangeResults);
      core.info(`📦 Dry run mode - would commit and push: ${commitMessage}`);
      return;
    }

    core.info('📦 Committing and pushing changes...');
    
    try {
      // Add all changed files to staging area
      await addChangedFiles({ cwd: this.options.repoRoot });
      
      // Check if there are any changes to commit
      const hasChanges = await hasChangesToCommit({ cwd: this.options.repoRoot });
      
      if (hasChanges) {
        // Create commit message
        const commitMessage = this.createCommitMessage(moduleChangeResults);
        
        // Commit changes
        await commitChanges(commitMessage, { cwd: this.options.repoRoot });
        core.info(`  Committed changes: ${commitMessage}`);
        
        // Push commits to remote
        await pushCommits({ cwd: this.options.repoRoot });
        core.info('  Pushed commits to remote');
      } else {
        core.info('  No changes to commit');
      }
    } catch (error) {
      core.warning(`Failed to commit and push changes: ${error}`);
      // Continue execution - don't fail the entire process if git operations fail
    }
  }

  async createAndPushTags(moduleChangeResults: ModuleChangeResult[]): Promise<string[]> {
    const createdTags: string[] = [];
    
    if (!this.options.pushTags) {
      core.info('🏷️ Skipping tag creation (disabled by push-tags input)');
      return createdTags;
    }

    if (!this.options.pushChanges) {
      core.info('🏷️ Skipping tag creation and push (disabled by push-changes input)');
      return createdTags;
    }

    if (this.options.dryRun) {
      core.info('🏷️ Dry run mode - tags that would be created:');
      for (const change of moduleChangeResults) {
        const tagName = `${change.name}@${change.to}`;
        createdTags.push(tagName);
        core.info(`  Would create tag: ${tagName}`);
      }
      return createdTags;
    }

    core.info('🏷️ Creating tags...');
    for (const change of moduleChangeResults) {
      const tagName = `${change.name}@${change.to}`;
      const message = `Release ${change.name} v${change.to}`;
      
      createTag(tagName, message, { cwd: this.options.repoRoot });
      createdTags.push(tagName);
      core.info(`  Created tag: ${tagName}`);
    }

    // Push tags
    core.info('📤 Pushing tags...');
    pushTags({ cwd: this.options.repoRoot });
    core.info(`✅ Pushed ${createdTags.length} tags to remote`);

    return createdTags;
  }

  private createCommitMessage(moduleChangeResults: ModuleChangeResult[]): string {
    const moduleNames = moduleChangeResults.map(change => change.name);
    
    return moduleNames.length === 1 
      ? `chore(release): ${moduleNames[0]} ${moduleChangeResults[0].to}`
      : `chore(release): update ${moduleNames.length} modules`;
  }
}