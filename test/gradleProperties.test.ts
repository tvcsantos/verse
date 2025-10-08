import { describe, it, expect } from 'vitest';
import { moduleIdToVersionPropertyName } from '../src/adapters/gradle/parsers/gradleProperties.js';

describe('Gradle Properties Parser', () => {
  describe('moduleIdToVersionPropertyName', () => {
    it('should convert root module to version property', () => {
      expect(moduleIdToVersionPropertyName(':')).toBe('version');
    });

    it('should convert single level module to property name', () => {
      expect(moduleIdToVersionPropertyName(':x')).toBe('x.version');
    });

    it('should convert multi-level module to property name', () => {
      expect(moduleIdToVersionPropertyName(':x:y')).toBe('y.version');
      expect(moduleIdToVersionPropertyName(':spring:core')).toBe('core.version');
    });

    it('should handle complex module paths', () => {
      expect(moduleIdToVersionPropertyName(':a:b:c:d-b')).toBe('d-b.version');
    });
  });
});