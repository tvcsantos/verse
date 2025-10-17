/**
 * Apply -SNAPSHOT suffix to a version string.
 * This follows convention where -SNAPSHOT is appended to all versions.
 */
export function applySnapshotSuffix(version: string): string {
  // Don't add -SNAPSHOT if it's already there
  if (version.endsWith('-SNAPSHOT')) {
    return version;
  }
  
  return `${version}-SNAPSHOT`;
}