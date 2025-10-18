import { SemVer } from "semver";
import { ProjectInfo } from "./hierarchy.js";
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
export type CommitInfo = {
    readonly hash: string;
    readonly type: string;
    readonly scope?: string;
    readonly subject: string;
    readonly body?: string;
    readonly breaking: boolean;
    readonly module?: string;
};
//# sourceMappingURL=core.d.ts.map