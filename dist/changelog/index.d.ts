import { ModuleChange, CommitInfo } from '../adapters/core.js';
import { ProjectInfo } from '../adapters/hierarchy.js';
export interface ChangelogEntry {
    module: ProjectInfo;
    version: string;
    date: string;
    changes: {
        breaking: CommitInfo[];
        features: CommitInfo[];
        fixes: CommitInfo[];
        other: CommitInfo[];
    };
}
export interface ChangelogOptions {
    includeCommitHashes: boolean;
    includeScopes: boolean;
    groupByType: boolean;
}
/**
 * Generate changelog for a module
 */
export declare function generateChangelog(module: ProjectInfo, moduleChange: ModuleChange, commits: CommitInfo[], options?: ChangelogOptions): Promise<string>;
/**
 * Update or create CHANGELOG.md file for a module
 */
export declare function updateChangelogFile(module: ProjectInfo, changelogContent: string, repoRoot: string): Promise<string>;
/**
 * Generate changelog for multiple modules
 */
export declare function generateChangelogsForModules(moduleChanges: ModuleChange[], getCommitsForModule: (module: ProjectInfo) => Promise<CommitInfo[]>, repoRoot: string, options?: ChangelogOptions): Promise<string[]>;
/**
 * Generate a root changelog that summarizes all module changes
 */
export declare function generateRootChangelog(moduleChanges: ModuleChange[], repoRoot: string): Promise<string>;
//# sourceMappingURL=index.d.ts.map