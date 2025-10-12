import * as core from '@actions/core';
import { CommitInfo } from '../adapters/core.js';
import { generateChangelogsForModules, generateRootChangelog } from '../changelog/index.js';
import { ModuleChangeResult } from './versionApplier.js';

export type ChangelogGeneratorOptions = {
  repoRoot: string;
  dryRun: boolean;
};

export class ChangelogGenerator {
  private options: ChangelogGeneratorOptions;

  constructor(options: ChangelogGeneratorOptions) {
    this.options = options;
  }

  async generateChangelogs(
    moduleResults: ModuleChangeResult[],
    moduleCommits: Map<string, CommitInfo[]>
  ): Promise<string[]> {
    core.info('📚 Generating changelogs...');
    
    if (this.options.dryRun) {
      core.info('🏃‍♂️ Dry run mode - changelogs will not be written to files');
      return [];
    }
    
    // Generate individual module changelogs
    const changelogPaths = await generateChangelogsForModules(
      moduleResults,
      async (moduleId) => moduleCommits.get(moduleId) || [],
      this.options.repoRoot
    );

    // Generate root changelog
    const rootChangelogPath = await generateRootChangelog(moduleResults, this.options.repoRoot);
    changelogPaths.push(rootChangelogPath);

    core.info(`📝 Generated ${changelogPaths.length} changelog files`);
    return changelogPaths;
  }
}