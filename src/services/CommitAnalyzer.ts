import * as core from '@actions/core';
import { CommitInfo } from '../adapters/core.js';
import { HierarchyModuleManager } from '../adapters/hierarchy/hierarchyModuleManager.js';
import { getCommitsSinceLastTag } from '../git/index.js';

export class CommitAnalyzer {
  
  constructor(private readonly repoRoot: string) {
  }

  async analyzeCommitsSinceLastRelease(hierarchyManager: HierarchyModuleManager): Promise<Map<string, CommitInfo[]>> {
    core.info('📝 Analyzing commits since last release...');
    
    const moduleCommits = new Map<string, CommitInfo[]>();
    
    for (const [projectId, projectInfo] of hierarchyManager.getModules()) {
      const commits = await getCommitsSinceLastTag(
        projectInfo.path, 
        projectInfo.name,
        projectInfo.type,
        { cwd: this.repoRoot }
      );
      moduleCommits.set(projectId, commits);
    }

    const totalCommits = Array.from(moduleCommits.values()).reduce((sum, commits) => sum + commits.length, 0);
    core.info(`📊 Analyzed ${totalCommits} commits across ${moduleCommits.size} modules`);
    
    return moduleCommits;
  }
}