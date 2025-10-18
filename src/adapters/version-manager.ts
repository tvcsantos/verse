import { SemVer } from 'semver';
import { ModuleManager } from './module-manager.js';
import { VersionUpdateStrategy } from "./version-update-strategy.js";
import { formatSemVer } from '../semver/index.js';

/**
 * Generic version management implementation that uses strategy pattern for build-system specific operations.
 * Uses an in-memory store to batch updates and commit them all at once.
 */
export class VersionManager {
  private readonly pendingUpdates = new Map<string, string>();

  constructor(
    private readonly hierarchyManager: ModuleManager,
    private readonly strategy: VersionUpdateStrategy
  ) { }

  /**
   * Stage a version update for a module in memory.
   * The update will be persisted when commit() is called.
   */
  updateVersion(moduleId: string, newVersion: SemVer | string): void {
    if (!this.hierarchyManager.hasModule(moduleId)) {
        throw new Error(`Module ${moduleId} not found`);
    }
    
    // Convert SemVer to string if needed, otherwise use string directly
    const versionString = typeof newVersion === 'string' ? newVersion : formatSemVer(newVersion);
    this.pendingUpdates.set(moduleId, versionString);
  }

  /**
   * Commit all pending version updates to the build system's version files.
   * This method performs all file writes at once to avoid multiple I/O operations.
   * Uses the strategy pattern to delegate build-system specific operations.
   */
  async commit(): Promise<void> {
    if (this.pendingUpdates.size === 0) {
      return; // Nothing to commit
    }

    // Write all version updates using strategy
    await this.strategy.writeVersionUpdates(this.pendingUpdates);

    // Clear the pending updates after successful commit
    this.pendingUpdates.clear();
  }

  /**
   * Get all pending version updates that haven't been committed yet.
   * Useful for debugging or validation purposes.
   */
  getPendingUpdates(): Map<string, string> {
    return new Map(this.pendingUpdates);
  }

  /**
   * Check if there are any pending updates that need to be committed.
   */
  hasPendingUpdates(): boolean {
    return this.pendingUpdates.size > 0;
  }

  /**
   * Clear all pending updates without committing them.
   * Use with caution - this will discard all staged version updates.
   */
  clearPendingUpdates(): void {
    this.pendingUpdates.clear();
  }
}
