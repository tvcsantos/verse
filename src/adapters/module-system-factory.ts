import { ModuleDetector } from "./module-detector";
import { VersionUpdateStrategy } from "./version-update-strategy";

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
