import { SemVer } from 'semver';
import { HierarchyModuleManager } from './hierarchy/hierarchyModuleManager.js';
import { VersionUpdateStrategy } from './core.js';
import { formatSemVer } from '../semver/index.js';

/**
 * Generic version management implementation that uses strategy pattern for build-system specific operations.
 * Uses an in-memory store to batch updates and commit them all at once.
 */
export class VersionManager {
  private readonly pendingVersionUpdates = new Map<string, SemVer>();
  private readonly pendingVersionStringUpdates = new Map<string, string>();

  constructor(
    private readonly hierarchyManager: HierarchyModuleManager,
    private readonly strategy: VersionUpdateStrategy
  ) { }

  /**
   * Stage a version update for a module in memory.
   * The update will be persisted when commit() is called.
   */
  updateVersion(moduleId: string, newVersion: SemVer): void {
    if (!this.hierarchyManager.hasModule(moduleId)) {
        throw new Error(`Module ${moduleId} not found`);
    }
    
    // Store the update in memory
    this.pendingVersionUpdates.set(moduleId, newVersion);
  }

  /**
   * Stage a version update using a version string (for build metadata support).
   * The update will be persisted when commit() is called.
   */
  updateVersionString(moduleId: string, versionString: string): void {
    if (!this.hierarchyManager.hasModule(moduleId)) {
        throw new Error(`Module ${moduleId} not found`);
    }
    
    // Store the update in memory - we'll parse it later if needed
    this.pendingVersionStringUpdates.set(moduleId, versionString);
  }

  /**
   * Commit all pending version updates to the build system's version files.
   * This method performs all file writes at once to avoid multiple I/O operations.
   * Uses the strategy pattern to delegate build-system specific operations.
   */
  async commit(): Promise<void> {
    if (this.pendingVersionUpdates.size === 0 && this.pendingVersionStringUpdates.size === 0) {
      return; // Nothing to commit
    }

    // Convert SemVer objects to version strings and merge with string updates
    const moduleVersions = new Map<string, string>();
    
    for (const [moduleId, newVersion] of this.pendingVersionUpdates) {
      const versionString = formatSemVer(newVersion);
      moduleVersions.set(moduleId, versionString);
    }

    // Add string updates (these take priority for build metadata)
    for (const [moduleId, versionString] of this.pendingVersionStringUpdates) {
      moduleVersions.set(moduleId, versionString);
    }

    // Write all version updates using strategy
    await this.strategy.writeVersionUpdates(moduleVersions);

    // Clear the pending updates after successful commit
    this.pendingVersionUpdates.clear();
    this.pendingVersionStringUpdates.clear();
  }

  /**
   * Get all pending version updates that haven't been committed yet.
   * Useful for debugging or validation purposes.
   */
  getPendingUpdates(): Map<string, SemVer> {
    return new Map(this.pendingVersionUpdates);
  }

  /**
   * Check if there are any pending updates that need to be committed.
   */
  hasPendingUpdates(): boolean {
    return this.pendingVersionUpdates.size > 0 || this.pendingVersionStringUpdates.size > 0;
  }

  /**
   * Clear all pending updates without committing them.
   * Use with caution - this will discard all staged version updates.
   */
  clearPendingUpdates(): void {
    this.pendingVersionUpdates.clear();
    this.pendingVersionStringUpdates.clear();
  }
}