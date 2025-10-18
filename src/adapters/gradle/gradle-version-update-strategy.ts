import { join } from 'path';
import { VersionUpdateStrategy } from "../version-update-strategy.js";
import { moduleIdToVersionPropertyName } from './gradle-properties.js';
import { upsertProperties } from '../../utils/properties.js';
import { GRADLE_PROPERTIES_FILE } from './constants.js';

/**
 * Gradle-specific implementation for version update operations.
 * Handles gradle.properties file updates and module ID to property name conversion.
 */
export class GradleVersionUpdateStrategy implements VersionUpdateStrategy {
  private readonly versionFilePath: string;

  constructor(repoRoot: string) {
    this.versionFilePath = join(repoRoot, GRADLE_PROPERTIES_FILE);
  }
  
  /**
   * Write version updates for modules to gradle.properties file.
   * Converts module IDs to property names and performs batch update.
   */
  async writeVersionUpdates(moduleVersions: Map<string, string>): Promise<void> {
    // Convert module IDs to property names
    const propertyUpdates = new Map<string, string>();
    
    for (const [moduleId, versionString] of moduleVersions) {
      const propertyName = moduleIdToVersionPropertyName(moduleId);
      propertyUpdates.set(propertyName, versionString);
    }
    
    // Write all properties to gradle.properties file in one operation
    await upsertProperties(this.versionFilePath, propertyUpdates);
  }
}
