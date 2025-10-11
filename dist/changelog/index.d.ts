import { CommitInfo, ProcessedModuleChange } from '../adapters/core.js';
import { ProjectInfo } from '../adapters/hierarchy.js';
export type ChangelogEntry = {
    readonly module: ProjectInfo;
    readonly version: string;
    readonly date: string;
    readonly changes: {
        readonly breaking: CommitInfo[];
        readonly features: CommitInfo[];
        readonly fixes: CommitInfo[];
        readonly other: CommitInfo[];
    };
};
export type ChangelogOptions = {
    readonly includeCommitHashes: boolean;
    readonly includeScopes: boolean;
    readonly groupByType: boolean;
};
/**
 * Generate changelog for a module
 */
export declare function generateChangelog(module: ProjectInfo, moduleChange: ProcessedModuleChange, commits: CommitInfo[], options?: ChangelogOptions): Promise<string>;
/**
 * Update or create CHANGELOG.md file for a module
 */
export declare function updateChangelogFile(module: ProjectInfo, changelogContent: string, repoRoot: string): Promise<string>;
/**
 * Generate changelog for multiple modules
 */
export declare function generateChangelogsForModules(moduleChanges: ProcessedModuleChange[], getCommitsForModule: (module: ProjectInfo) => Promise<CommitInfo[]>, repoRoot: string, options?: ChangelogOptions): Promise<string[]>;
/**
 * Generate a root changelog that summarizes all module changes
 */
export declare function generateRootChangelog(moduleChanges: ProcessedModuleChange[], repoRoot: string): Promise<string>;
//# sourceMappingURL=index.d.ts.map