/**
 * Apply Gradle -SNAPSHOT suffix to a version string.
 * This follows Gradle convention where -SNAPSHOT is appended to all versions.
 */
export function applyGradleSnapshot(version: string): string {
  // Don't add -SNAPSHOT if it's already there
  if (version.endsWith('-SNAPSHOT')) {
    return version;
  }
  
  return `${version}-SNAPSHOT`;
}