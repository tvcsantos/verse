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
 * Strategy interface for build-system specific operations.
 * Implementations provide build-system specific logic for version updates.
 */
export interface VersionUpdateStrategy {
    /**
     * Write version updates for modules to the build system's version files.
     * @param moduleVersions Map of module IDs to their new version strings
     */
    writeVersionUpdates(moduleVersions: Map<string, string>): Promise<void>;
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
/**
 * Factory interface for creating module system components.
 * Each build system (Gradle, Maven, npm, etc.) should implement this interface.
 */
export interface ModuleSystemFactory {
    /**
     * Create a module detector for this build system.
     * @returns ModuleDetector instance
     */
    createDetector(): ModuleDetector;
    /**
     * Create a version update strategy for this build system.
     * @returns VersionUpdateStrategy instance
     */
    createVersionUpdateStrategy(): VersionUpdateStrategy;
}
//# sourceMappingURL=core.d.ts.map