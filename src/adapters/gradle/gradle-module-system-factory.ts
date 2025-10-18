import { ModuleSystemFactory, ModuleDetector, VersionUpdateStrategy } from '../core.js';
import { GradleModuleDetector } from './gradle-module-detector.js';
import { GradleVersionUpdateStrategy } from './gradle-version-update-strategy.js';

/**
 * Factory for creating Gradle-specific module system components.
 * Handles instantiation of Gradle module detector and version update strategy.
 */
export class GradleModuleSystemFactory implements ModuleSystemFactory {
  constructor(private readonly repoRoot: string) {}
  
  /**
   * Create a Gradle module detector.
   */
  createDetector(): ModuleDetector {
    return new GradleModuleDetector(this.repoRoot);
  }
  
  /**
   * Create a Gradle version update strategy.
   */
  createVersionUpdateStrategy(): VersionUpdateStrategy {
    return new GradleVersionUpdateStrategy(this.repoRoot);
  }
}
