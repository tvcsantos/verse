import * as core from '@actions/core';
import { 
  ModuleChange,
  BumpType,
  CommitInfo,
  ModuleSystemFactory
} from './adapters/core.js';
import { HierarchyModuleManager } from './adapters/hierarchy/hierarchyModuleManager.js';
import { VersionManager } from './adapters/versionManager.js';
import { createModuleSystemFactory } from './factories/moduleSystemFactory.js';
import { loadConfig, getDependencyBumpType, Config } from './config/index.js';
import { 
  getCommitsSinceLastTag,
  createTag,
  pushTags,
  getCurrentBranch,
  isWorkingDirectoryClean,
  getCurrentCommitShortSha,
  addChangedFiles,
  commitChanges,
  pushCommits,
  hasChangesToCommit
} from './git/index.js';
import { 
  calculateCascadeEffects
} from './graph/index.js';
import { bumpSemVer, bumpToPrerelease, formatSemVer, addBuildMetadata, generateTimestampPrereleaseId } from './semver/index.js';
import { SemVer } from 'semver';
import { 
  generateChangelogsForModules,
  generateRootChangelog
} from './changelog/index.js';
import { calculateBumpFromCommits } from './utils/commits.js';
import { applyGradleSnapshot } from './adapters/gradle/gradleUtils.js';

export interface RunnerOptions {
  repoRoot: string;
  adapter: string;
  configPath: string;
  releaseBranches: string[];
  dryRun: boolean;
  createReleases: boolean;
  pushTags: boolean;
  fetchDepth: number;
  prereleaseMode: boolean;
  prereleaseId: string;
  bumpUnchanged: boolean;
  addBuildMetadata: boolean;
  timestampVersions: boolean;
  gradleSnapshot: boolean;
  pushChanges: boolean;
}

export interface RunnerResult {
  bumped: boolean;
  changedModules: Array<{
    id: string;
    from: string;
    to: string;
    bumpType: BumpType;
  }>;
  createdTags: string[];
  changelogPaths: string[];
  manifestPath?: string;
}

export class MonorepoVersionRunner {
  private moduleSystemFactory: ModuleSystemFactory;
  private hierarchyManager!: HierarchyModuleManager; // Will be initialized in run()
  private versionManager!: VersionManager; // Will be initialized in run()
  private config!: Config; // Will be initialized in run()
  private options: RunnerOptions;

  constructor(options: RunnerOptions) {
    this.options = options;
    this.moduleSystemFactory = createModuleSystemFactory(options.adapter, options.repoRoot);
  }

  async run(): Promise<RunnerResult> {
    core.info('🚀 Starting Monorepo Version Manager...');
    
    // Load configuration
    this.config = await loadConfig(this.options.configPath, this.options.repoRoot);
    core.info(`📋 Loaded config from ${this.options.configPath}`);

    // Check if we're on a release branch
    const currentBranch = await getCurrentBranch({ cwd: this.options.repoRoot });
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
    const detector = this.moduleSystemFactory.createDetector();
    this.hierarchyManager = await detector.detect();
    
    // Create version manager  
    const versionUpdateStrategy = this.moduleSystemFactory.createVersionUpdateStrategy();
    this.versionManager = new VersionManager(this.hierarchyManager, versionUpdateStrategy);
    
    // Log discovered modules through hierarchy manager
    const moduleIds = this.hierarchyManager.getModuleIds();
    core.info(`Found ${moduleIds.length} modules: ${moduleIds.join(', ')}`);

    // Analyze commits since last release
    core.info('📝 Analyzing commits...');
    const moduleCommits = new Map<string, CommitInfo[]>();
    
    for (const [projectId, projectInfo] of this.hierarchyManager.getModules()) {
      const commits = await getCommitsSinceLastTag(
        projectInfo.path, 
        projectInfo.name,
        projectInfo.type,
        { cwd: this.options.repoRoot }
      );
      moduleCommits.set(projectId, commits);
    }

    // Get current commit short SHA if build metadata is enabled
    let shortSha: string | undefined;
    if (this.options.addBuildMetadata) {
      shortSha = await getCurrentCommitShortSha({ cwd: this.options.repoRoot });
      core.info(`📋 Build metadata will include short SHA: ${shortSha}`);
    }

    // Generate timestamp-based prerelease ID if timestamp versions are enabled
    let effectivePrereleaseId = this.options.prereleaseId;
    if (this.options.timestampVersions && this.options.prereleaseMode) {
      effectivePrereleaseId = generateTimestampPrereleaseId(this.options.prereleaseId);
      core.info(`🕐 Generated timestamp prerelease ID: ${effectivePrereleaseId}`);
    }

    // Calculate version bumps for each module
    core.info('🔢 Calculating version bumps...');
    const moduleChanges: ModuleChange[] = [];
    
    for (const [projectId, projectInfo] of this.hierarchyManager.getModules()) {
      const commits = moduleCommits.get(projectId) || [];
      const currentVersion = projectInfo.version; // Get version directly from ProjectInfo
      
      // Determine bump type from commits
      const bumpType = calculateBumpFromCommits(commits, this.config);
      
      // Handle version bumping based on mode
      let shouldBump = bumpType !== 'none';
      let actualBumpType = bumpType;
      let reason: 'commits' | 'prerelease-unchanged' | 'build-metadata' = 'commits';
      
      // In prerelease mode with bumpUnchanged, also bump modules with no changes
      if (this.options.prereleaseMode && this.options.bumpUnchanged && bumpType === 'none') {
        shouldBump = true;
        actualBumpType = 'none'; // Will be handled by bumpToPrerelease
        reason = 'prerelease-unchanged';
      }
      
      // When build metadata is enabled, all modules should be updated
      if (this.options.addBuildMetadata && bumpType === 'none' && !shouldBump) {
        shouldBump = true;
        actualBumpType = 'none';
        reason = 'build-metadata';
      }
      
      if (shouldBump) {
        let newVersion: SemVer = currentVersion;
        
        // Handle different versioning scenarios
        if (actualBumpType !== 'none' && this.options.prereleaseMode) {
          // Scenario 1: Commits with changes in prerelease mode
          newVersion = bumpToPrerelease(currentVersion, actualBumpType, effectivePrereleaseId);
        } else if (actualBumpType !== 'none' && !this.options.prereleaseMode) {
          // Scenario 2: Commits with changes in normal mode
          newVersion = bumpSemVer(currentVersion, actualBumpType);
        } else if (reason === 'prerelease-unchanged') {
          // Scenario 3: No changes but force prerelease bump (bumpUnchanged enabled)
          // Implied: actualBumpType === 'none' (from cascade)
          newVersion = bumpToPrerelease(currentVersion, 'none', effectivePrereleaseId);
        }
        // Scenario 4: reason === 'build-metadata' - no version bump, keep currentVersion
        
        // Add build metadata if enabled (applies to all scenarios)
        if (this.options.addBuildMetadata && shortSha) {
          newVersion = addBuildMetadata(newVersion, shortSha);
        }
        
        moduleChanges.push({
          module: projectInfo,
          fromVersion: currentVersion,
          toVersion: formatSemVer(newVersion),
          bumpType: actualBumpType,
          reason: reason,
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
        
        let newVersion;
        if (this.options.prereleaseMode) {
          newVersion = bumpToPrerelease(change.fromVersion, change.bumpType, effectivePrereleaseId);
        } else {
          newVersion = bumpSemVer(change.fromVersion, change.bumpType);
        }
        
        // Add build metadata to cascade changes if enabled
        if (this.options.addBuildMetadata && shortSha) {
          newVersion = addBuildMetadata(newVersion, shortSha);
        }
        
        change.toVersion = formatSemVer(newVersion);
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

    // Apply Gradle snapshot suffix directly to toVersion if enabled
    if (this.options.gradleSnapshot && this.options.adapter === 'gradle') {
      // Update changed modules - apply snapshot transformation directly to toVersion
      for (const change of allChanges) {
        change.toVersion = applyGradleSnapshot(change.toVersion);
      }

      // Handle unchanged modules that also need -SNAPSHOT suffix
      const changedModuleIds = new Set(allChanges.map(change => change.module.id));
      for (const [moduleId, moduleInfo] of this.hierarchyManager.getModules()) {
        if (!changedModuleIds.has(moduleId)) {
          const currentVersion = moduleInfo.version;
          const versionString = formatSemVer(currentVersion);
          const snapshotVersion = applyGradleSnapshot(versionString);
          
          // Only add to changes if the version doesn't already have -SNAPSHOT
          if (snapshotVersion !== versionString) {
            allChanges.push({
              module: moduleInfo,
              fromVersion: currentVersion,
              toVersion: snapshotVersion, // Apply snapshot directly to toVersion
              bumpType: 'none',
              reason: 'gradle-snapshot' as any,
            });
          }
        }
      }
    }

    core.info(`📈 Planning to update ${allChanges.length} modules:`);
    for (const change of allChanges) {
      const from = formatSemVer(change.fromVersion);
      const to = change.toVersion;
      core.info(`  ${change.module.id}: ${from} → ${to} (${change.bumpType}, ${change.reason})`);
    }

    if (this.options.dryRun) {
      core.info('🏃‍♂️ Dry run mode - no changes will be written');
      return {
        bumped: true,
        changedModules: allChanges.map(change => ({
          id: change.module.id,
          from: formatSemVer(change.fromVersion),
          to: change.toVersion,
          bumpType: change.bumpType,
        })),
        createdTags: allChanges.map(change => `${change.module.name}@${change.toVersion}`),
        changelogPaths: [],
      };
    }

    // Stage new versions in memory
    core.info('✍️ Staging new versions...');
    for (const change of allChanges) {
      // Use toVersion directly (now includes all transformations like Gradle snapshots)
      this.versionManager.updateVersion(change.module.id, change.toVersion);
      core.info(`  Staged ${change.module.id} to ${change.toVersion}`);
    }

    // Commit all version updates to files
    core.info('💾 Committing version updates to files...');
    await this.versionManager.commit();
    core.info(`  Committed ${allChanges.length} version updates`);

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

    // Commit and push changes (if enabled)
    if (this.options.pushChanges) {
      core.info('📦 Committing and pushing changes...');
      try {
        // Add all changed files to staging area
        await addChangedFiles({ cwd: this.options.repoRoot });
        
        // Check if there are any changes to commit
        const hasChanges = await hasChangesToCommit({ cwd: this.options.repoRoot });
        
        if (hasChanges) {
          // Create commit message
          const moduleNames = allChanges.map(change => change.module.name);
          const commitMessage = moduleNames.length === 1 
            ? `chore(release): ${moduleNames[0]} ${allChanges[0].toVersion}`
            : `chore(release): update ${moduleNames.length} modules`;
          
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
    } else {
      core.info('📦 Skipping commit and push (disabled by push-changes input)');
    }

    // Create tags
    const createdTags: string[] = [];
    if (this.options.pushTags && this.options.pushChanges) {
      core.info('🏷️ Creating tags...');
      for (const change of allChanges) {
        const tagName = `${change.module.name}@${change.toVersion}`;
        const message = `Release ${change.module.name} v${change.toVersion}`;
        
        createTag(tagName, message, { cwd: this.options.repoRoot });
        createdTags.push(tagName);
        core.info(`  Created tag: ${tagName}`);
      }

      // Push tags
      core.info('📤 Pushing tags...');
      pushTags({ cwd: this.options.repoRoot });
    } else if (this.options.pushTags && !this.options.pushChanges) {
      core.info('🏷️ Skipping tag creation and push (disabled by push-changes input)');
    }

    core.info('✅ Version management completed successfully!');

    return {
      bumped: true,
      changedModules: allChanges.map(change => ({
        id: change.module.id,
        from: formatSemVer(change.fromVersion),
        to: change.toVersion,
        bumpType: change.bumpType,
      })),
      createdTags,
      changelogPaths,
    };
  }
}