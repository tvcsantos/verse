import * as core from '@actions/core';
import { 
  ModuleDetector,
  ModuleChange,
  BumpType,
  CommitInfo,
  VersionManager
} from './adapters/core.js';
import { HierarchyModuleManager } from './adapters/hierarchy/hierarchyModuleManager.js';

import { GradleModuleDetector } from './adapters/gradle/gradleAdapter.js';
import { GradleVersionManager } from './adapters/gradle/gradleVersionManager.js';
import { loadConfig, getBumpTypeForCommit, getDependencyBumpType, Config } from './config/index.js';
import { 
  getCommitsSinceLastTag,
  createTag,
  pushTags,
  getCurrentBranch,
  isWorkingDirectoryClean
} from './git/index.js';
import { 
  calculateCascadeEffects
} from './graph/index.js';
import { bumpSemVer, maxBumpType, formatSemVer } from './semver/index.js';
import { 
  generateChangelogsForModules,
  generateRootChangelog
} from './changelog/index.js';

export interface RunnerOptions {
  repoRoot: string;
  adapter: string;
  configPath: string;
  releaseBranches: string[];
  dryRun: boolean;
  createReleases: boolean;
  pushTags: boolean;
  fetchDepth: number;
}

export interface RunnerResult {
  bumped: boolean;
  changedModules: Array<{
    name: string;
    from: string;
    to: string;
    bumpType: BumpType;
  }>;
  createdTags: string[];
  changelogPaths: string[];
  manifestPath?: string;
}

export class MonorepoVersionRunner {
  private detector: ModuleDetector;
  private hierarchyManager!: HierarchyModuleManager; // Will be initialized in run()
  private versionManager!: VersionManager; // Will be initialized in run()
  private config!: Config; // Will be initialized in run()
  private options: RunnerOptions;

  constructor(options: RunnerOptions) {
    this.options = options;
    this.detector = this.createDetector(options.adapter, options.repoRoot);
  }

  async run(): Promise<RunnerResult> {
    core.info('🚀 Starting Monorepo Version Manager...');
    
    // Load configuration
    this.config = await loadConfig(this.options.configPath, this.options.repoRoot);
    core.info(`📋 Loaded config from ${this.options.configPath}`);

    // Check if we're on a release branch
    const currentBranch = getCurrentBranch({ cwd: this.options.repoRoot });
    if (!this.options.releaseBranches.includes(currentBranch)) {
      core.info(`⚠️  Not on a release branch (current: ${currentBranch}), skipping versioning`);
      return {
        bumped: false,
        changedModules: [],
        createdTags: [],
        changelogPaths: [],
      };
    }

    // Check if working directory is clean
    if (!this.options.dryRun && !isWorkingDirectoryClean({ cwd: this.options.repoRoot })) {
      throw new Error('Working directory is not clean. Please commit or stash your changes.');
    }

    // Discover modules and get hierarchy manager
    core.info('🔍 Discovering modules...');
    this.hierarchyManager = await this.detector.detect();
    
    // Create version manager  
    this.versionManager = this.createVersionManager(this.options.adapter, this.options.repoRoot, this.hierarchyManager);
    
    // Log discovered modules through hierarchy manager
    const moduleIds = this.hierarchyManager.getModuleIds();
    core.info(`Found ${moduleIds.length} modules: ${moduleIds.join(', ')}`);

    // Analyze commits since last release
    core.info('📝 Analyzing commits...');
    const moduleCommits = new Map<string, CommitInfo[]>();
    
    for (const [projectId, projectInfo] of this.hierarchyManager.getModules()) {
      const commits = await getCommitsSinceLastTag(projectInfo.path, { cwd: this.options.repoRoot });
      moduleCommits.set(projectId, commits);
    }

    // Calculate version bumps for each module
    core.info('🔢 Calculating version bumps...');
    const moduleChanges: ModuleChange[] = [];
    
    for (const [projectId, projectInfo] of this.hierarchyManager.getModules()) {
      const commits = moduleCommits.get(projectId) || [];
      const currentVersion = projectInfo.version; // Get version directly from ProjectInfo
      
      // Determine bump type from commits
      const bumpType = this.calculateBumpFromCommits(commits);
      
      if (bumpType !== 'none') {
        const newVersion = bumpSemVer(currentVersion, bumpType);
        moduleChanges.push({
          module: projectInfo,
          fromVersion: currentVersion,
          toVersion: newVersion,
          bumpType,
          reason: 'commits',
        });
      }
    }

    // Calculate cascade effects
    core.info('🌊 Calculating cascade effects...');
    const cascadeResult = calculateCascadeEffects(
      this.hierarchyManager,
      moduleChanges,
      (dependencyBump: BumpType) => getDependencyBumpType(dependencyBump, this.config)
    );

    // Update cascade changes with actual version calculations
    for (const change of cascadeResult.changes) {
      if (change.reason === 'cascade') {
        change.fromVersion = change.module.version; // Get version directly from ProjectInfo
        change.toVersion = bumpSemVer(change.fromVersion, change.bumpType);
      }
    }

    const allChanges = cascadeResult.changes;
    
    if (allChanges.length === 0) {
      core.info('✨ No version changes needed');
      return {
        bumped: false,
        changedModules: [],
        createdTags: [],
        changelogPaths: [],
      };
    }

    core.info(`📈 Planning to update ${allChanges.length} modules:`);
    for (const change of allChanges) {
      const from = formatSemVer(change.fromVersion);
      const to = formatSemVer(change.toVersion);
      core.info(`  ${change.module.id}: ${from} → ${to} (${change.bumpType}, ${change.reason})`);
    }

    if (this.options.dryRun) {
      core.info('🏃‍♂️ Dry run mode - no changes will be written');
      return {
        bumped: true,
        changedModules: allChanges.map(change => ({
          name: change.module.id,
          from: formatSemVer(change.fromVersion),
          to: formatSemVer(change.toVersion),
          bumpType: change.bumpType,
        })),
        createdTags: allChanges.map(change => 
          `${change.module.id}@${formatSemVer(change.toVersion)}`
        ),
        changelogPaths: [],
      };
    }

    // Write new versions
    core.info('✍️ Writing new versions...');
    for (const change of allChanges) {
      await this.versionManager.updateVersion(change.module.id, change.toVersion);
      core.info(`  Updated ${change.module.id} to ${formatSemVer(change.toVersion)}`);
    }

    // Generate changelogs
    core.info('📚 Generating changelogs...');
    const changelogPaths = await generateChangelogsForModules(
      allChanges,
      async (module) => moduleCommits.get(module.id) || [],
      this.options.repoRoot
    );

    // Generate root changelog
    const rootChangelogPath = await generateRootChangelog(allChanges, this.options.repoRoot);
    changelogPaths.push(rootChangelogPath);

    // Create tags
    const createdTags: string[] = [];
    if (this.options.pushTags) {
      core.info('🏷️ Creating tags...');
      for (const change of allChanges) {
        const tagName = `${change.module.id}@${formatSemVer(change.toVersion)}`;
        const message = `Release ${change.module.id} v${formatSemVer(change.toVersion)}`;
        
        createTag(tagName, message, { cwd: this.options.repoRoot });
        createdTags.push(tagName);
        core.info(`  Created tag: ${tagName}`);
      }

      // Push tags
      core.info('📤 Pushing tags...');
      pushTags({ cwd: this.options.repoRoot });
    }

    core.info('✅ Version management completed successfully!');

    return {
      bumped: true,
      changedModules: allChanges.map(change => ({
        name: change.module.id,
        from: formatSemVer(change.fromVersion),
        to: formatSemVer(change.toVersion),
        bumpType: change.bumpType,
      })),
      createdTags,
      changelogPaths,
    };
  }

  private createDetector(adapterName: string, repoRoot: string): ModuleDetector {
    switch (adapterName.toLowerCase()) {
      case 'gradle':
        return new GradleModuleDetector(repoRoot);
      default:
        throw new Error(`Unsupported adapter: ${adapterName}`);
    }
  }

  private createVersionManager(adapterName: string, repoRoot: string, hierarchyManager: HierarchyModuleManager): VersionManager {
    switch (adapterName.toLowerCase()) {
      case 'gradle':
        return new GradleVersionManager(repoRoot, hierarchyManager);
      default:
        throw new Error(`Unsupported adapter: ${adapterName}`);
    }
  }

  private calculateBumpFromCommits(commits: CommitInfo[]): BumpType {
    const bumpTypes: BumpType[] = [];

    for (const commit of commits) {
      const bumpType = getBumpTypeForCommit(commit.type, commit.breaking, this.config);
      if (bumpType !== 'none') {
        bumpTypes.push(bumpType);
      }
    }

    return maxBumpType(bumpTypes);
  }
}