import { AdapterIdentifier } from '../identifier.js';
import * as fs from 'fs/promises';
import { GRADLE_PROPERTIES_FILE, GRADLE_BUILD_FILE, GRADLE_BUILD_KTS_FILE, GRADLE_SETTINGS_FILE, GRADLE_SETTINGS_KTS_FILE, GRADLE_ID } from './constants.js';

const GRADLE_FILES = [
  GRADLE_PROPERTIES_FILE,
  GRADLE_BUILD_FILE,
  GRADLE_BUILD_KTS_FILE,
  GRADLE_SETTINGS_FILE,
  GRADLE_SETTINGS_KTS_FILE
];

/**
 * Adapter identifier for Gradle projects.
 * Identifies Gradle projects by looking for build.gradle(.kts) and settings.gradle(.kts) files.
 */
export class GradleAdapterIdentifier implements AdapterIdentifier {
  readonly metadata = {
    id: GRADLE_ID,
    capabilities: {
      supportsSnapshots: true
    }
  };

  async accept(projectRoot: string): Promise<boolean> {
    try {
      const files = await fs.readdir(projectRoot);
      
      const hasGradleFile = GRADLE_FILES.some(file => files.includes(file));
      
      if (hasGradleFile) {
        return true;
      }

      return false;
    } catch (error) {
      // If we can't read the directory, this adapter doesn't apply
      return false;
    }
  }
}
