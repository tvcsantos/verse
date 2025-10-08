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
  getCurrentCommitShortSha
} from './git/index.js';
import { 
  calculateCascadeEffects
} from './graph/index.js';
import { bumpSemVer, bumpToPrerelease, formatSemVer, addBuildMetadataAsString, generateTimestampPrereleaseId } from './semver/index.js';
import { 
  generateChangelogsForModules,
  generateRootChangelog
} from './changelog/index.js';
import { calculateBumpFromCommits } from './utils/commits.js';

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
        let newVersion;
        let newVersionString;
        
        if (actualBumpType === 'none' && reason === 'build-metadata') {
          // Only add build metadata to existing version without bumping
          newVersion = currentVersion;
          newVersionString = addBuildMetadataAsString(currentVersion, shortSha!);
        } else {
          // Normal version bump
          if (this.options.prereleaseMode) {
            newVersion = bumpToPrerelease(currentVersion, actualBumpType, effectivePrereleaseId);
          } else {
            newVersion = bumpSemVer(currentVersion, actualBumpType);
          }
          
          // Add build metadata if enabled
          if (this.options.addBuildMetadata && shortSha) {
            newVersionString = addBuildMetadataAsString(newVersion, shortSha);
          } else {
            newVersionString = formatSemVer(newVersion);
          }
        }
        
        moduleChanges.push({
          module: projectInfo,
          fromVersion: currentVersion,
          toVersion: newVersion,
          bumpType: actualBumpType,
          reason: reason,
        });
        
        // Store the final version string with build metadata for later use
        (moduleChanges[moduleChanges.length - 1] as any).finalVersionString = newVersionString;
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
        
        change.toVersion = newVersion;
        
        // Add build metadata to cascade changes if enabled
        if (this.options.addBuildMetadata && shortSha) {
          const finalVersionString = addBuildMetadataAsString(newVersion, shortSha);
          (change as any).finalVersionString = finalVersionString;
        }
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

    // Apply Gradle snapshot suffix to final versions if enabled
    if (this.options.gradleSnapshot && this.options.adapter === 'gradle') {
      // Update changed modules
      for (const change of allChanges) {
        const finalVersionString = (change as any).finalVersionString;
        if (finalVersionString) {
          (change as any).finalVersionString = this.applyGradleSnapshot(finalVersionString);
        } else {
          (change as any).finalVersionString = this.applyGradleSnapshot(formatSemVer(change.toVersion));
        }
      }

      // Handle unchanged modules that also need -SNAPSHOT suffix
      const changedModuleIds = new Set(allChanges.map(change => change.module.id));
      for (const [moduleId, moduleInfo] of this.hierarchyManager.getModules()) {
        if (!changedModuleIds.has(moduleId)) {
          const currentVersion = moduleInfo.version;
          const versionString = formatSemVer(currentVersion);
          const snapshotVersion = this.applyGradleSnapshot(versionString);
          
          // Only add to changes if the version doesn't already have -SNAPSHOT
          if (snapshotVersion !== versionString) {
            allChanges.push({
              module: moduleInfo,
              fromVersion: currentVersion,
              toVersion: currentVersion, // No actual version bump
              bumpType: 'none',
              reason: 'gradle-snapshot' as any,
            });
            // Set the final version string for this change
            (allChanges[allChanges.length - 1] as any).finalVersionString = snapshotVersion;
          }
        }
      }
    }

    core.info(`📈 Planning to update ${allChanges.length} modules:`);
    for (const change of allChanges) {
      const finalVersionString = (change as any).finalVersionString;
      const from = formatSemVer(change.fromVersion);
      const to = finalVersionString || formatSemVer(change.toVersion);
      core.info(`  ${change.module.id}: ${from} → ${to} (${change.bumpType}, ${change.reason})`);
    }

    if (this.options.dryRun) {
      core.info('🏃‍♂️ Dry run mode - no changes will be written');
      return {
        bumped: true,
        changedModules: allChanges.map(change => {
          const finalVersionString = (change as any).finalVersionString;
          return {
            id: change.module.id,
            from: formatSemVer(change.fromVersion),
            to: finalVersionString || formatSemVer(change.toVersion),
            bumpType: change.bumpType,
          };
        }),
        createdTags: allChanges.map(change => {
          const finalVersionString = (change as any).finalVersionString;
          return `${change.module.name}@${finalVersionString || formatSemVer(change.toVersion)}`;
        }),
        changelogPaths: [],
      };
    }

    // Stage new versions in memory
    core.info('✍️ Staging new versions...');
    for (const change of allChanges) {
      const finalVersionString = (change as any).finalVersionString;
      if (finalVersionString) {
        // Use string version for build metadata or Gradle snapshots
        this.versionManager.updateVersionString(change.module.id, finalVersionString);
        core.info(`  Staged ${change.module.id} to ${finalVersionString}`);
      } else {
        // Use SemVer version for normal cases
        this.versionManager.updateVersion(change.module.id, change.toVersion);
        core.info(`  Staged ${change.module.id} to ${formatSemVer(change.toVersion)}`);
      }
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
      changedModules: allChanges.map(change => {
        const finalVersionString = (change as any).finalVersionString;
        return {
          id: change.module.id,
          from: formatSemVer(change.fromVersion),
          to: finalVersionString || formatSemVer(change.toVersion),
          bumpType: change.bumpType,
        };
      }),
      createdTags,
      changelogPaths,
    };
  }

  /**
   * Apply Gradle -SNAPSHOT suffix to a version string.
   * This follows Gradle convention where -SNAPSHOT is appended to all versions.
   */
  private applyGradleSnapshot(version: string): string {
    // Don't add -SNAPSHOT if it's already there
    if (version.endsWith('-SNAPSHOT')) {
      return version;
    }
    
    return `${version}-SNAPSHOT`;
  }
}