import { describe, it, expect } from 'vitest';
import { parseSemVer, formatSemVer, bumpSemVer, compareSemVer, maxBumpType } from '../src/semver/index.js';

describe('SemVer Utilities', () => {
  describe('parseSemVer', () => {
    it('should parse basic semantic versions', () => {
      expect(parseSemVer('1.2.3')).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
      });
    });

    it('should parse versions with prerelease', () => {
      expect(parseSemVer('1.2.3-alpha.1')).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'alpha.1',
      });
    });

    it('should parse versions with build metadata', () => {
      expect(parseSemVer('1.2.3+build.1')).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        build: 'build.1',
      });
    });

    it('should handle versions with v prefix', () => {
      expect(parseSemVer('v1.2.3')).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
      });
    });

    it('should throw on invalid versions', () => {
      expect(() => parseSemVer('1.2')).toThrow('Invalid semantic version');
      expect(() => parseSemVer('invalid')).toThrow('Invalid semantic version');
    });
  });

  describe('formatSemVer', () => {
    it('should format basic versions', () => {
      expect(formatSemVer({ major: 1, minor: 2, patch: 3 })).toBe('1.2.3');
    });

    it('should format versions with prerelease', () => {
      expect(formatSemVer({ 
        major: 1, 
        minor: 2, 
        patch: 3, 
        prerelease: 'alpha.1' 
      })).toBe('1.2.3-alpha.1');
    });

    it('should format versions with build metadata', () => {
      expect(formatSemVer({ 
        major: 1, 
        minor: 2, 
        patch: 3, 
        build: 'build.1' 
      })).toBe('1.2.3+build.1');
    });
  });

  describe('bumpSemVer', () => {
    const version = { major: 1, minor: 2, patch: 3 };

    it('should bump major version', () => {
      expect(bumpSemVer(version, 'major')).toEqual({
        major: 2,
        minor: 0,
        patch: 0,
      });
    });

    it('should bump minor version', () => {
      expect(bumpSemVer(version, 'minor')).toEqual({
        major: 1,
        minor: 3,
        patch: 0,
      });
    });

    it('should bump patch version', () => {
      expect(bumpSemVer(version, 'patch')).toEqual({
        major: 1,
        minor: 2,
        patch: 4,
      });
    });

    it('should not bump for none type', () => {
      expect(bumpSemVer(version, 'none')).toEqual(version);
    });
  });

  describe('compareSemVer', () => {
    it('should compare versions correctly', () => {
      const v1 = { major: 1, minor: 0, patch: 0 };
      const v2 = { major: 1, minor: 0, patch: 1 };
      const v3 = { major: 1, minor: 1, patch: 0 };
      const v4 = { major: 2, minor: 0, patch: 0 };

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