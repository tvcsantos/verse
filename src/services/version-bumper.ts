import * as core from '@actions/core';
import { ProcessingModuleChange, ProcessedModuleChange, BumpType, ChangeReason, CommitInfo } from '../adapters/core.js';
import { Config, getDependencyBumpType } from '../config/index.js';
import { ModuleManager } from '../adapters/hierarchy/module-manager.js';
import { calculateCascadeEffects } from '../graph/index.js';
import { calculateBumpFromCommits } from '../utils/commits.js';
import { bumpSemVer, bumpToPrerelease, formatSemVer, addBuildMetadata, generateTimestampPrereleaseId } from '../semver/index.js';
import { getCurrentCommitShortSha } from '../git/index.js';
import { SemVer } from 'semver';
import { AdapterMetadata } from '../adapters/identifier.js';
import { applySnapshotSuffix } from '../utils/versioning.js';

export type VersionBumperOptions = {
  prereleaseMode: boolean;
  bumpUnchanged: boolean;
  addBuildMetadata: boolean;
  appendSnapshot: boolean;
  adapter: AdapterMetadata;
  timestampVersions: boolean;
  prereleaseId: string;
  repoRoot: string;
};

export class VersionBumper {

  constructor(private readonly options: VersionBumperOptions) {
  }

  async calculateVersionBumps(
    hierarchyManager: ModuleManager,
    moduleCommits: Map<string, CommitInfo[]>,
    config: Config
  ): Promise<ProcessedModuleChange[]> {
    core.info('🔢 Calculating version bumps from commits...');
    
    // Generate timestamp-based prerelease ID if timestamp versions are enabled
    let effectivePrereleaseId = this.options.prereleaseId;
    if (this.options.timestampVersions && this.options.prereleaseMode) {
      effectivePrereleaseId = generateTimestampPrereleaseId(this.options.prereleaseId);
      core.info(`🕐 Generated timestamp prerelease ID: ${effectivePrereleaseId}`);
    }

    // Get current commit short SHA if build metadata is enabled
    let shortSha: string | undefined;
    if (this.options.addBuildMetadata) {
      shortSha = await getCurrentCommitShortSha({ cwd: this.options.repoRoot });
      core.info(`📋 Build metadata will include short SHA: ${shortSha}`);
    }
    
    // Step 1: Calculate initial bump types for all modules
    const processingModuleChanges = this.calculateInitialBumps(hierarchyManager, moduleCommits, config);
    
    // Step 2: Calculate cascade effects
    core.info('🌊 Calculating cascade effects...');
    const cascadedChanges = calculateCascadeEffects(
      hierarchyManager,
      processingModuleChanges,
      (dependencyBump: BumpType) => getDependencyBumpType(dependencyBump, config)
    );
    
    // Step 3: Apply version calculations and transformations
    core.info('🔢 Calculating actual versions...');
    return this.applyVersionCalculations(cascadedChanges, effectivePrereleaseId, shortSha);
  }

  private calculateInitialBumps(
    hierarchyManager: ModuleManager,
    moduleCommits: Map<string, CommitInfo[]>,
    config: Config
  ): ProcessingModuleChange[] {
    const processingModuleChanges: ProcessingModuleChange[] = [];
    
    for (const [projectId, projectInfo] of hierarchyManager.getModules()) {
      const commits = moduleCommits.get(projectId) || [];
      
      // Determine bump type from commits only
      const bumpType = calculateBumpFromCommits(commits, config);
      
      // Determine processing requirements and reason
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
        bumpType: bumpType,
        reason: reason,
        needsProcessing: needsProcessing,
      });
    }

    return processingModuleChanges;
  }

  private applyVersionCalculations(
    processingModuleChanges: ProcessingModuleChange[],
    effectivePrereleaseId: string,
    shortSha?: string
  ): ProcessedModuleChange[] {
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

      // Apply append snapshot suffix if enabled (to all modules in append mode)
      if (this.options.appendSnapshot && this.options.adapter.capabilities.supportsSnapshots) {
        const originalVersion = change.toVersion;
        change.toVersion = applySnapshotSuffix(change.toVersion);

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

    core.info(`📈 Calculated versions for ${processedModuleChanges.length} modules requiring updates`);
    return processedModuleChanges;
  }
}
