import { describe, it, expect } from 'vitest';
import { bumpToPrerelease, parseSemVer, addBuildMetadataAsString } from '../src/semver/index.js';
import { BumpType } from '../src/adapters/core.js';

describe('Pre-release Version Management', () => {
  describe('bumpToPrerelease', () => {
    it('should convert regular version to patch prerelease when no changes', () => {
      const version = parseSemVer('1.2.3');
      const result = bumpToPrerelease(version, 'none', 'SNAPSHOT');
      expect(result.version).toBe('1.2.4-SNAPSHOT.0');
    });

    it('should increment existing prerelease version when no changes', () => {
      const version = parseSemVer('1.2.3-SNAPSHOT.0');
      const result = bumpToPrerelease(version, 'none', 'SNAPSHOT');
      expect(result.version).toBe('1.2.3-SNAPSHOT.1');
    });

    it('should create patch prerelease version', () => {
      const version = parseSemVer('1.2.3');
      const result = bumpToPrerelease(version, 'patch', 'alpha');
      expect(result.version).toBe('1.2.4-alpha.0');
    });

    it('should create minor prerelease version', () => {
      const version = parseSemVer('1.2.3');
      const result = bumpToPrerelease(version, 'minor', 'beta');
      expect(result.version).toBe('1.3.0-beta.0');
    });

    it('should create major prerelease version', () => {
      const version = parseSemVer('1.2.3');
      const result = bumpToPrerelease(version, 'major', 'rc');
      expect(result.version).toBe('2.0.0-rc.0');
    });

    it('should handle custom prerelease identifiers', () => {
      const version = parseSemVer('1.0.0');
      const result = bumpToPrerelease(version, 'patch', 'dev');
      expect(result.version).toBe('1.0.1-dev.0');
    });

    it('should handle SNAPSHOT identifier', () => {
      const version = parseSemVer('2.1.0');
      const result = bumpToPrerelease(version, 'minor', 'SNAPSHOT');
      expect(result.version).toBe('2.2.0-SNAPSHOT.0');
    });

    it('should throw error for invalid bump type', () => {
      const version = parseSemVer('1.0.0');
      expect(() => {
        bumpToPrerelease(version, 'invalid' as BumpType, 'SNAPSHOT');
      }).toThrow('Invalid bump type for prerelease: invalid');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero version', () => {
      const version = parseSemVer('0.0.0');
      const result = bumpToPrerelease(version, 'patch', 'SNAPSHOT');
      expect(result.version).toBe('0.0.1-SNAPSHOT.0');
    });

    it('should handle version with existing different prerelease', () => {
      const version = parseSemVer('1.0.0-alpha.5');
      const result = bumpToPrerelease(version, 'none', 'SNAPSHOT');
      expect(result.version).toBe('1.0.0-SNAPSHOT.0');
    });

    it('should handle large version numbers', () => {
      const version = parseSemVer('10.25.99');
      const result = bumpToPrerelease(version, 'major', 'SNAPSHOT');
      expect(result.version).toBe('11.0.0-SNAPSHOT.0');
    });
  });
});

describe('Build Metadata Support', () => {
  describe('addBuildMetadataAsString', () => {
    it('should add build metadata to regular version', () => {
      const version = parseSemVer('1.2.3');
      const result = addBuildMetadataAsString(version, 'abc123');
      expect(result).toBe('1.2.3+abc123');
    });

    it('should add build metadata to prerelease version', () => {
      const version = parseSemVer('1.2.3-SNAPSHOT.0');
      const result = addBuildMetadataAsString(version, 'def456');
      expect(result).toBe('1.2.3-SNAPSHOT.0+def456');
    });

    it('should handle short SHA format', () => {
      const version = parseSemVer('2.1.0');
      const result = addBuildMetadataAsString(version, '7a8b9c2');
      expect(result).toBe('2.1.0+7a8b9c2');
    });

    it('should work with alpha prerelease', () => {
      const version = parseSemVer('3.0.0-alpha.1');
      const result = addBuildMetadataAsString(version, 'build123');
      expect(result).toBe('3.0.0-alpha.1+build123');
    });

    it('should handle zero version', () => {
      const version = parseSemVer('0.0.0');
      const result = addBuildMetadataAsString(version, 'init');
      expect(result).toBe('0.0.0+init');
    });
  });
});