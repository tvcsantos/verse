import * as core from '@actions/core';
import { 
  ProcessingModuleChange,
  ProcessedModuleChange,
  BumpType,
  ChangeReason,
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

    // Calculate bump types for ALL modules (changed and unchanged)
    core.info('🔢 Calculating bump types from commits...');
    let processingModuleChanges: ProcessingModuleChange[] = [];
    
    for (const [projectId, projectInfo] of this.hierarchyManager.getModules()) {
      const commits = moduleCommits.get(projectId) || [];
      
      // Determine bump type from commits only
      const bumpType = calculateBumpFromCommits(commits, this.config);
      
      // Determine processing requirements and reason
      let actualBumpType = bumpType;
      let reason: ChangeReason | 'unchanged' = 'unchanged';
      let needsProcessing = false;
      
      if (bumpType !== 'none') {
        // Module has commits that require version changes
        needsProcessing = true;
        reason = 'commits';
      } else if (this.options.prereleaseMode && this.options.bumpUnchanged) {
        // Prerelease mode with bumpUnchanged - include modules with no changes
        needsProcessing = true;
        reason = 'prerelease-unchanged';
      } else if (this.options.addBuildMetadata) {
        // Build metadata mode - all modules need updates for metadata
        needsProcessing = true;
        reason = 'build-metadata';
      }
      
      // Create module change for ALL modules - processing flag determines behavior
      processingModuleChanges.push({
        module: projectInfo,
        fromVersion: projectInfo.version,
        toVersion: '', // Will be calculated later
        bumpType: actualBumpType,
        reason: reason,
        needsProcessing: needsProcessing,
      });
    }

    // Calculate cascade effects
    core.info('🌊 Calculating cascade effects...');
    processingModuleChanges = calculateCascadeEffects(
      this.hierarchyManager,
      processingModuleChanges,
      (dependencyBump: BumpType) => getDependencyBumpType(dependencyBump, this.config)
    );
    
    // Apply version calculations and collect modules that need updates
    core.info('🔢 Calculating actual versions...');
    const processedModuleChanges: ProcessedModuleChange[] = [];
    
    for (const change of processingModuleChanges) {
      let newVersion: SemVer = change.fromVersion;
      
      // Only apply version changes if module needs processing
      if (change.needsProcessing) {
        // Apply version bumps based on module state
        if (change.bumpType !== 'none' && this.options.prereleaseMode) {
          // Scenario 1: Commits with changes in prerelease mode
          newVersion = bumpToPrerelease(change.fromVersion, change.bumpType, effectivePrereleaseId);
        } else if (change.bumpType !== 'none' && !this.options.prereleaseMode) {
          // Scenario 2: Commits with changes in normal mode
          newVersion = bumpSemVer(change.fromVersion, change.bumpType);
        } else if (change.reason === 'prerelease-unchanged') {
          // Scenario 3: No changes but force prerelease bump (bumpUnchanged enabled)
          newVersion = bumpToPrerelease(change.fromVersion, 'none', effectivePrereleaseId);
        }
        // Scenario 4: reason === 'build-metadata' or 'unchanged' - no version bump, keep fromVersion
        
        // Add build metadata if enabled (applies to all scenarios)
        if (this.options.addBuildMetadata && shortSha) {
          newVersion = addBuildMetadata(newVersion, shortSha);
        }
      }
      
      // Convert to string version
      change.toVersion = formatSemVer(newVersion);
      
      // Apply Gradle snapshot suffix if enabled (to all modules in gradle mode)
      if (this.options.gradleSnapshot && this.options.adapter === 'gradle') {
        const originalVersion = change.toVersion;
        change.toVersion = applyGradleSnapshot(change.toVersion);
        
        // If snapshot suffix was actually added and module wasn't already being processed, mark it for processing
        if (!change.needsProcessing && change.toVersion !== originalVersion) {
          change.needsProcessing = true;
          change.reason = 'gradle-snapshot';
        }
      }
      
      // Add to update collection only if module needs processing
      if (change.needsProcessing) {
        // Convert to ProcessedModuleChange since we know needsProcessing is true
        const processedChange: ProcessedModuleChange = {
          module: change.module,
          fromVersion: change.fromVersion,
          toVersion: change.toVersion,
          bumpType: change.bumpType,
          reason: change.reason as ChangeReason, // Safe cast since needsProcessing is true
        };
        processedModuleChanges.push(processedChange);
      }
    }
    
    if (processedModuleChanges.length === 0) {
      core.info('✨ No version changes needed');
      return {
        bumped: false,
        changedModules: [],
        createdTags: [],
        changelogPaths: [],
      };
    }

    core.info(`📈 Planning to update ${processedModuleChanges.length} modules:`);
    for (const change of processedModuleChanges) {
      const from = formatSemVer(change.fromVersion);
      const to = change.toVersion;
      core.info(`  ${change.module.id}: ${from} → ${to} (${change.bumpType}, ${change.reason})`);
    }

    if (this.options.dryRun) {
      core.info('🏃‍♂️ Dry run mode - no changes will be written');
      return {
        bumped: true,
        changedModules: processedModuleChanges.map(change => ({
          id: change.module.id,
          from: formatSemVer(change.fromVersion),
          to: change.toVersion,
          bumpType: change.bumpType,
        })),
        createdTags: processedModuleChanges.map(change => `${change.module.name}@${change.toVersion}`),
        changelogPaths: [],
      };
    }

    // Stage new versions in memory
    core.info('✍️ Staging new versions...');
    for (const change of processedModuleChanges) {
      // Use toVersion directly (now includes all transformations like Gradle snapshots)
      this.versionManager.updateVersion(change.module.id, change.toVersion);
      core.info(`  Staged ${change.module.id} to ${change.toVersion}`);
    }

    // Commit all version updates to files
    core.info('💾 Committing version updates to files...');
    await this.versionManager.commit();
    core.info(`  Committed ${processedModuleChanges.length} version updates`);

    // Generate changelogs
    core.info('📚 Generating changelogs...');
    const changelogPaths = await generateChangelogsForModules(
      processedModuleChanges,
      async (module) => moduleCommits.get(module.id) || [],
      this.options.repoRoot
    );

    // Generate root changelog
    const rootChangelogPath = await generateRootChangelog(processedModuleChanges, this.options.repoRoot);
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
          const moduleNames = processedModuleChanges.map(change => change.module.name);
          const commitMessage = moduleNames.length === 1 
            ? `chore(release): ${moduleNames[0]} ${processedModuleChanges[0].toVersion}`
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
      for (const change of processedModuleChanges) {
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
      changedModules: processedModuleChanges.map(change => ({
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