import { SemVer } from 'semver';
import { HierarchyModuleManager } from './hierarchy/hierarchyModuleManager.js';
import { VersionUpdateStrategy } from './core.js';
/**
 * Generic version management implementation that uses strategy pattern for build-system specific operations.
 * Uses an in-memory store to batch updates and commit them all at once.
 */
export declare class VersionManager {
    private readonly hierarchyManager;
    private readonly strategy;
    private readonly pendingVersionUpdates;
    constructor(hierarchyManager: HierarchyModuleManager, strategy: VersionUpdateStrategy);
    /**
     * Stage a version update for a module in memory.
     * The update will be persisted when commit() is called.
     */
    updateVersion(moduleId: string, newVersion: SemVer): void;
    /**
     * Commit all pending version updates to the build system's version files.
     * This method performs all file writes at once to avoid multiple I/O operations.
     * Uses the strategy pattern to delegate build-system specific operations.
     */
    commit(): Promise<void>;
    /**
     * Get all pending version updates that haven't been committed yet.
     * Useful for debugging or validation purposes.
     */
    getPendingUpdates(): Map<string, SemVer>;
    /**
     * Check if there are any pending updates that need to be committed.
     */
    hasPendingUpdates(): boolean;
    /**
     * Clear all pending updates without committing them.
     * Use with caution - this will discard all staged version updates.
     */
    clearPendingUpdates(): void;
}
//# sourceMappingURL=versionManager.d.ts.map