import { SemVer } from "semver";
import { ProjectInfo } from "./hierarchy.js";
import { HierarchyModuleManager } from "./hierarchy/hierarchyModuleManager.js";

export interface ModuleChange {
  module: ProjectInfo;
  fromVersion: SemVer;
  toVersion: SemVer;
  bumpType: BumpType;
  reason: ChangeReason;
}

export type BumpType = 'major' | 'minor' | 'patch' | 'none';

export type ChangeReason = 'commits' | 'dependency' | 'cascade';

/**
 * General interface for version management operations.
 * Implementations handle build-system-specific version updates.
 */
export interface VersionManager {
  /**
   * Update the version of a module using the build system's version management approach
   */
  updateVersion(moduleId: string, newVersion: SemVer): Promise<void>;
}

export interface CommitInfo {
  hash: string;
  type: string;
  scope?: string;
  subject: string;
  body?: string;
  breaking: boolean;
  module?: string;
}

export interface ModuleDetector {
  readonly repoRoot: string;
  
  /**
   * Detect all modules in the repository and return a hierarchy manager
   */
  detect(): Promise<HierarchyModuleManager>;
}
