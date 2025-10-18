import { SemVer } from "semver";
import { ProjectInfo } from "./hierarchy.js";
import { ModuleManager } from "./hierarchy/module-manager.js";
export type ProcessingModuleChange = {
    readonly module: ProjectInfo;
    readonly fromVersion: SemVer;
    toVersion: string;
    bumpType: BumpType;
    reason: ChangeReason | 'unchanged';
    needsProcessing: boolean;
};
export type ProcessedModuleChange = {
    readonly module: ProjectInfo;
    readonly fromVersion: SemVer;
    readonly toVersion: string;
    readonly bumpType: BumpType;
    readonly reason: ChangeReason;
};
export type BumpType = 'major' | 'minor' | 'patch' | 'none';
export type ChangeReason = 'commits' | 'dependency' | 'cascade' | 'prerelease-unchanged' | 'build-metadata' | 'gradle-snapshot';
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
export type CommitInfo = {
    readonly hash: string;
    readonly type: string;
    readonly scope?: string;
    readonly subject: string;
    readonly body?: string;
    readonly breaking: boolean;
    readonly module?: string;
};
export interface ModuleDetector {
    readonly repoRoot: string;
    /**
     * Detect all modules in the repository and return a hierarchy manager
     */
    detect(): Promise<ModuleManager>;
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