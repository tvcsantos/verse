import { AdapterIdentifier } from '../identifier.js';
import * as fs from 'fs/promises';

/**
 * Adapter identifier for Gradle projects.
 * Identifies Gradle projects by looking for build.gradle(.kts) and settings.gradle(.kts) files.
 */
export class GradleAdapterIdentifier implements AdapterIdentifier {
  async identify(projectRoot: string): Promise<string | null> {
    try {
      const files = await fs.readdir(projectRoot);
      
      // Check for Gradle build files
      const gradleFiles = [
        'build.gradle',
        'build.gradle.kts',
        'settings.gradle',
        'settings.gradle.kts'
      ];
      
      const hasGradleFile = gradleFiles.some(file => files.includes(file));
      
      if (hasGradleFile) {
        return 'gradle';
      }
      
      return null;
    } catch (error) {
      // If we can't read the directory, this adapter doesn't apply
      return null;
    }
  }
}