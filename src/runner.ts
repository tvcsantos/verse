import * as core from '@actions/core';
import { 
  LanguageAdapter,
  ModuleChange,
  BumpType,
  CommitInfo,
} from './adapters/core.js';
import { GradleAdapter } from './adapters/gradle/gradleAdapter.js';
import { loadConfig, getBumpTypeForCommit, getDependencyBumpType, Config } from './config/index.js';
import { 
  getCommitsSinceLastTag,
  createTag,
  pushTags,
  getCurrentBranch,
  isWorkingDirectoryClean
} from './git/index.js';
import { 
  buildDependencyGraph,
  calculateCascadeEffects,
  topologicalSort
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
  private adapter: LanguageAdapter;
  private config!: Config; // Will be initialized in run()
  private options: RunnerOptions;

  constructor(options: RunnerOptions) {
    this.options = options;
    this.adapter = this.createAdapter(options.adapter, options.repoRoot);
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

    // Discover modules
    core.info('🔍 Discovering modules...');
    const modules = await this.adapter.detectModules(this.options.repoRoot);
    core.info(`Found ${modules.length} modules: ${modules.map(m => m.name).join(', ')}`);

    // Build dependency graph
    core.info('📊 Building dependency graph...');
    const graph = await buildDependencyGraph(modules, (module) => this.adapter.getDependencies(module));

    // Analyze commits since last release
    core.info('📝 Analyzing commits...');
    const moduleCommits = new Map<string, CommitInfo[]>();
    
    for (const module of modules) {
      const commits = await getCommitsSinceLastTag(module.relativePath, { cwd: this.options.repoRoot });
      moduleCommits.set(module.name, commits);
    }

    // Calculate version bumps for each module
    core.info('🔢 Calculating version bumps...');
    const moduleChanges: ModuleChange[] = [];
    
    for (const module of modules) {
      const commits = moduleCommits.get(module.name) || [];
      const currentVersion = await this.adapter.readVersion(module);
      
      // Determine bump type from commits
      const bumpType = this.calculateBumpFromCommits(commits);
      
      if (bumpType !== 'none') {
        const newVersion = bumpSemVer(currentVersion, bumpType);
        moduleChanges.push({
          module,
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
      graph,
      moduleChanges,
      (moduleName, dependencyBump) => getDependencyBumpType(dependencyBump, this.config)
    );

    // Update cascade changes with actual version calculations
    for (const change of cascadeResult.changes) {
      if (change.reason === 'cascade') {
        change.fromVersion = await this.adapter.readVersion(change.module);
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
      core.info(`  ${change.module.name}: ${from} → ${to} (${change.bumpType}, ${change.reason})`);
    }

    if (this.options.dryRun) {
      core.info('🏃‍♂️ Dry run mode - no changes will be written');
      return {
        bumped: true,
        changedModules: allChanges.map(change => ({
          name: change.module.name,
          from: formatSemVer(change.fromVersion),
          to: formatSemVer(change.toVersion),
          bumpType: change.bumpType,
        })),
        createdTags: allChanges.map(change => 
          `${change.module.name}@${formatSemVer(change.toVersion)}`
        ),
        changelogPaths: [],
      };
    }

    // Write new versions
    core.info('✍️ Writing new versions...');
    for (const change of allChanges) {
      await this.adapter.writeVersion(change.module, change.toVersion);
      core.info(`  Updated ${change.module.name} to ${formatSemVer(change.toVersion)}`);
    }

    // Generate changelogs
    core.info('📚 Generating changelogs...');
    const changelogPaths = await generateChangelogsForModules(
      allChanges,
      async (module) => moduleCommits.get(module.name) || [],
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
        const tagName = `${change.module.name}@${formatSemVer(change.toVersion)}`;
        const message = `Release ${change.module.name} v${formatSemVer(change.toVersion)}`;
        
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
        name: change.module.name,
        from: formatSemVer(change.fromVersion),
        to: formatSemVer(change.toVersion),
        bumpType: change.bumpType,
      })),
      createdTags,
      changelogPaths,
    };
  }

  private createAdapter(adapterName: string, repoRoot: string): LanguageAdapter {
    switch (adapterName.toLowerCase()) {
      case 'gradle':
        return new GradleAdapter(repoRoot);
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