import { SemVer } from 'semver';
import { HierarchyModuleManager } from '../hierarchy/hierarchyModuleManager.js';
import { VersionManager } from '../core.js';
/**
 * Handles Gradle-specific version management operations.
 * Manages versions through gradle.properties files.
 * Uses an in-memory store to batch updates and commit them all at once.
 */
export declare class GradleVersionManager implements VersionManager {
    private readonly repoRoot;
    private readonly hierarchyManager;
    private readonly pendingVersionUpdates;
    constructor(repoRoot: string, hierarchyManager: HierarchyModuleManager);
    /**
     * Stage a version update for a module in memory.
     * The update will be persisted when commit() is called.
     */
    updateVersion(moduleId: string, newVersion: SemVer): void;
    /**
     * Commit all pending version updates to their respective gradle.properties files.
     * This method performs all file writes at once to avoid multiple I/O operations.
     * All module versions are written to the root gradle.properties file in a single operation.
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
//# sourceMappingURL=gradleVersionManager.d.ts.map