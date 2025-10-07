import { ModuleSystemFactory } from '../adapters/core.js';
import { GradleModuleSystemFactory } from '../adapters/gradle/gradleModuleSystemFactory.js';

/**
 * Create a module system factory for the specified adapter.
 * This is a template factory method that instantiates the correct factory based on adapter name.
 * 
 * @param adapterName The name of the build system adapter (e.g., 'gradle', 'maven', 'npm')
 * @param repoRoot The root directory of the repository
 * @returns ModuleSystemFactory instance for the specified adapter
 * @throws Error if the adapter is not supported
 */
export function createModuleSystemFactory(adapterName: string, repoRoot: string): ModuleSystemFactory {
  switch (adapterName.toLowerCase()) {
    case 'gradle':
      return new GradleModuleSystemFactory(repoRoot);
    default:
      throw new Error(`Unsupported adapter: ${adapterName}`);
  }
}