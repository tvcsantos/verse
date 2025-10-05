import { describe, it, expect } from 'vitest';
import { parseSemVer, formatSemVer, bumpSemVer, compareSemVer, maxBumpType } from '../src/semver/index.js';

describe('SemVer Utilities', () => {
  describe('parseSemVer', () => {
    it('should parse basic semantic versions', () => {
      const result = parseSemVer('1.2.3');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
    });

    it('should parse versions with prerelease', () => {
      const result = parseSemVer('1.2.3-alpha.1');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
      expect(result.prerelease).toEqual(['alpha', 1]);
    });

    it('should parse versions with build metadata', () => {
      const result = parseSemVer('1.2.3+build.1');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
      expect(result.build).toEqual(['build', '1']);
    });

    it('should handle versions with v prefix', () => {
      const result = parseSemVer('v1.2.3');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
    });

    it('should throw on invalid versions', () => {
      expect(() => parseSemVer('1.2')).toThrow('Invalid semantic version');
      expect(() => parseSemVer('invalid')).toThrow('Invalid semantic version');
    });
  });

  describe('formatSemVer', () => {
    it('should format basic versions', () => {
      const version = parseSemVer('1.2.3');
      expect(formatSemVer(version)).toBe('1.2.3');
    });

    it('should format versions with prerelease', () => {
      const version = parseSemVer('1.2.3-alpha.1');
      expect(formatSemVer(version)).toBe('1.2.3-alpha.1');
    });

    it('should format versions with build metadata', () => {
      const version = parseSemVer('1.2.3+build.1');
      expect(formatSemVer(version)).toBe('1.2.3+build.1');
    });
  });

  describe('bumpSemVer', () => {
    const version = parseSemVer('1.2.3');

    it('should bump major version', () => {
      const bumped = bumpSemVer(version, 'major');
      expect(bumped.major).toBe(2);
      expect(bumped.minor).toBe(0);
      expect(bumped.patch).toBe(0);
    });

    it('should bump minor version', () => {
      const bumped = bumpSemVer(version, 'minor');
      expect(bumped.major).toBe(1);
      expect(bumped.minor).toBe(3);
      expect(bumped.patch).toBe(0);
    });

    it('should bump patch version', () => {
      const bumped = bumpSemVer(version, 'patch');
      expect(bumped.major).toBe(1);
      expect(bumped.minor).toBe(2);
      expect(bumped.patch).toBe(4);
    });

    it('should not bump for none type', () => {
      const bumped = bumpSemVer(version, 'none');
      expect(bumped).toBe(version);
    });
  });

  describe('compareSemVer', () => {
    it('should compare versions correctly', () => {
      const v1 = parseSemVer('1.0.0');
      const v2 = parseSemVer('1.0.1');
      const v3 = parseSemVer('1.1.0');
      const v4 = parseSemVer('2.0.0');

      expect(compareSemVer(v1, v2)).toBeLessThan(0);
      expect(compareSemVer(v2, v1)).toBeGreaterThan(0);
      expect(compareSemVer(v1, v1)).toBe(0);
      expect(compareSemVer(v1, v3)).toBeLessThan(0);
      expect(compareSemVer(v1, v4)).toBeLessThan(0);
    });
  });

  describe('maxBumpType', () => {
    it('should return the highest bump type', () => {
      expect(maxBumpType(['patch', 'minor'])).toBe('minor');
      expect(maxBumpType(['patch', 'major', 'minor'])).toBe('major');
      expect(maxBumpType(['none', 'patch'])).toBe('patch');
      expect(maxBumpType(['none'])).toBe('none');
    });
  });
});