import { SemVer } from 'semver';
import { HierarchyModuleManager } from '../hierarchy/hierarchyModuleManager.js';
import { VersionManager } from '../core.js';
import { updateModuleVersionInGradleProperties } from './parsers/gradleProperties.js';

/**
 * Handles Gradle-specific version management operations.
 * Manages versions through gradle.properties files.
 */
export class GradleVersionManager implements VersionManager {
  constructor(
    private readonly repoRoot: string,
    private readonly hierarchyManager: HierarchyModuleManager
  ) { }

  /**
   * Update the version of a module in its gradle.properties file
   */
  async updateVersion(moduleId: string, newVersion: SemVer): Promise<void> {
    if (!this.hierarchyManager.hasModule(moduleId)) {
        throw new Error(`Module ${moduleId} not found`);
    }
    await updateModuleVersionInGradleProperties(this.repoRoot, moduleId, newVersion);
  }
}