import { SemVer, BumpType } from '../adapters/core.js';

/**
 * Parse a semantic version string into a SemVer object
 */
export function parseSemVer(versionString: string): SemVer {
  // Remove leading 'v' if present
  const cleanVersion = versionString.replace(/^v/, '');
  
  // Match semantic version pattern
  const match = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+(.+))?$/);
  
  if (!match) {
    throw new Error(`Invalid semantic version: ${versionString}`);
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
    build: match[5],
  };
}

/**
 * Convert a SemVer object to a string
 */
export function formatSemVer(version: SemVer): string {
  let result = `${version.major}.${version.minor}.${version.patch}`;
  
  if (version.prerelease) {
    result += `-${version.prerelease}`;
  }
  
  if (version.build) {
    result += `+${version.build}`;
  }
  
  return result;
}

/**
 * Compare two semantic versions
 * Returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareSemVer(a: SemVer, b: SemVer): number {
  // Compare major, minor, patch
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  
  if (a.patch !== b.patch) {
    return a.patch - b.patch;
  }
  
  // Handle prerelease versions
  if (a.prerelease && !b.prerelease) {
    return -1; // a < b (prerelease is less than release)
  }
  
  if (!a.prerelease && b.prerelease) {
    return 1; // a > b
  }
  
  if (a.prerelease && b.prerelease) {
    return a.prerelease.localeCompare(b.prerelease);
  }
  
  return 0; // Equal
}

/**
 * Bump a semantic version by the specified type
 */
export function bumpSemVer(version: SemVer, bumpType: BumpType): SemVer {
  if (bumpType === 'none') {
    return { ...version };
  }

  const newVersion: SemVer = {
    major: version.major,
    minor: version.minor,
    patch: version.patch,
    // Clear prerelease and build metadata on bump
  };

  switch (bumpType) {
    case 'major':
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    case 'minor':
      newVersion.minor += 1;
      newVersion.patch = 0;
      break;
    case 'patch':
      newVersion.patch += 1;
      break;
  }

  return newVersion;
}

/**
 * Determine the bump type needed to go from version A to version B
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
 * Check if a version is valid (all parts are non-negative integers)
 */
export function isValidSemVer(version: SemVer): boolean {
  return (
    Number.isInteger(version.major) && version.major >= 0 &&
    Number.isInteger(version.minor) && version.minor >= 0 &&
    Number.isInteger(version.patch) && version.patch >= 0
  );
}

/**
 * Create a new SemVer at 0.0.0
 */
export function createInitialVersion(): SemVer {
  return {
    major: 0,
    minor: 0,
    patch: 0,
  };
}