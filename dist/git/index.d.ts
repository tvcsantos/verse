import { CommitInfo } from '../adapters/core.js';
export interface GitTag {
    name: string;
    hash: string;
    module?: string;
    version?: string;
}
export interface GitOptions {
    cwd?: string;
}
/**
 * Get commits since the last tag for a specific module
 */
export declare function getCommitsSinceLastTag(modulePath: string, moduleName: string, moduleType: 'root' | 'module', options?: GitOptions): Promise<CommitInfo[]>;
/**
 * Get commits in a specific range, optionally filtered by path
 */
export declare function getCommitsInRange(range: string, pathFilter?: string, options?: GitOptions): Promise<CommitInfo[]>;
/**
 * Get the last tag for a specific module
 */
export declare function getLastTagForModule(moduleName: string, moduleType: 'root' | 'module', options?: GitOptions): Promise<string | null>;
/**
 * Get all tags in the repository
 */
export declare function getAllTags(options?: GitOptions): Promise<GitTag[]>;
/**
 * Create a git tag
 */
export declare function createTag(tagName: string, message: string, options?: GitOptions): Promise<void>;
/**
 * Push tags to remote
 */
export declare function pushTags(options?: GitOptions): Promise<void>;
/**
 * Check if the working directory is clean
 */
export declare function isWorkingDirectoryClean(options?: GitOptions): Promise<boolean>;
/**
 * Get the current branch name
 */
export declare function getCurrentBranch(options?: GitOptions): Promise<string>;
//# sourceMappingURL=index.d.ts.map