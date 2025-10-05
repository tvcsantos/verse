import * as semver from 'semver';
import { SemVer } from 'semver';
import { BumpType } from '../adapters/core.js';

/**
 * Parse a semantic version string into a SemVer object using node-semver
 */
export function parseSemVer(versionString: string): SemVer {
  const parsed = semver.parse(versionString);
  
  if (!parsed) {
    throw new Error(`Invalid semantic version: ${versionString}`);
  }

  return parsed;
}

/**
 * Convert a SemVer object to a string
 */
export function formatSemVer(version: SemVer): string {
  return version.raw;
}

/**
 * Compare two semantic versions using node-semver
 * Returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareSemVer(a: SemVer, b: SemVer): number {
  return semver.compare(a, b);
}

/**
 * Bump a semantic version based on the bump type using node-semver
 */
export function bumpSemVer(version: SemVer, bumpType: BumpType): SemVer {
  if (bumpType === 'none') {
    return version;
  }

  const bumpedVersionString = semver.inc(version, bumpType);
  if (!bumpedVersionString) {
    throw new Error(`Failed to bump version ${version.version} with type ${bumpType}`);
  }
  
  return parseSemVer(bumpedVersionString);
}

/**
 * Determine the bump type between two versions using node-semver
 */
export function getBumpType(from: SemVer, to: SemVer): BumpType {
  if (to.major > from.major) {
    return 'major';
  }
  
  if (to.minor > from.minor) {
    return 'minor';
  }
  
  if (to.patch > from.patch) {
    return 'patch';
  }
  
  return 'none';
}

/**
 * Get the highest bump type from a list of bump types
 */
export function maxBumpType(bumpTypes: BumpType[]): BumpType {
  const priority = { none: 0, patch: 1, minor: 2, major: 3 };
  
  return bumpTypes.reduce((max, current) => {
    return priority[current] > priority[max] ? current : max;
  }, 'none' as BumpType);
}

/**
 * Check if a version string is valid using node-semver
 */
export function isValidVersionString(versionString: string): boolean {
  return semver.valid(versionString) !== null;
}

/**
 * Create initial version (0.0.0) using node-semver
 */
export function createInitialVersion(): SemVer {
  return new SemVer('0.0.0');
}