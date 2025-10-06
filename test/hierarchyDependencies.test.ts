import { describe, it, expect } from 'vitest';
import { 
  parseHierarchyStructure, 
  getDependenciesOf, 
  getProjectPath
} from '../src/adapters/gradle/parsers/hierarchyDependencies.js';
import { ProjectHierarchy } from '../src/adapters/hierarchy.js';

describe('Hierarchy Dependencies Parser', () => {
  const sampleHierarchy: ProjectHierarchy = {
    ":": {
      path: "/Users/santotia/Code/Mercedes/dh-io-domains/mbio-starter",
      affectedSubprojects: [":base", ":spring", ":spring:core", ":spring:servlet"]
    },
    ":base": {
      path: "/Users/santotia/Code/Mercedes/dh-io-domains/mbio-starter/base",
      affectedSubprojects: []
    },
    ":spring": {
      path: "/Users/santotia/Code/Mercedes/dh-io-domains/mbio-starter/spring",
      affectedSubprojects: [":spring:core", ":spring:servlet"]
    },
    ":spring:core": {
      path: "/Users/santotia/Code/Mercedes/dh-io-domains/mbio-starter/spring/core",
      affectedSubprojects: []
    },
    ":spring:servlet": {
      path: "/Users/santotia/Code/Mercedes/dh-io-domains/mbio-starter/spring/servlet",
      affectedSubprojects: []
    }
  };

  describe('parseHierarchyStructure', () => {
    it('should parse hierarchy structure correctly', () => {
      const result = parseHierarchyStructure(sampleHierarchy);
      
      expect(result.hierarchy).toBe(sampleHierarchy);
      expect(result.projectIds).toHaveLength(5);
      expect(result.projectIds).toContain(':');
      expect(result.projectIds).toContain(':base');
      expect(result.projectIds).toContain(':spring');
      expect(result.projectIds).toContain(':spring:core');
      expect(result.projectIds).toContain(':spring:servlet');
      expect(result.rootProject).toBe(':');
    });


  });

  describe('getDependenciesOf', () => {
    it('should return projects that the given project depends on', () => {
      const result = parseHierarchyStructure(sampleHierarchy);
      
      // In the hierarchy structure, affected projects depend ON the project that affects them
      const springCoreDeps = getDependenciesOf(result, ':spring:core');
      expect(springCoreDeps).toContain(':');
      expect(springCoreDeps).toContain(':spring');
      
      const baseDeps = getDependenciesOf(result, ':base');
      expect(baseDeps).toContain(':');
      
      const rootDeps = getDependenciesOf(result, ':');
      expect(rootDeps).toHaveLength(0);
    });
  });

  describe('getProjectPath', () => {
    it('should return the file system path for a project', () => {
      const result = parseHierarchyStructure(sampleHierarchy);
      
      expect(getProjectPath(result, ':')).toBe('/Users/santotia/Code/Mercedes/dh-io-domains/mbio-starter');
      expect(getProjectPath(result, ':base')).toBe('/Users/santotia/Code/Mercedes/dh-io-domains/mbio-starter/base');
      expect(getProjectPath(result, ':spring:core')).toBe('/Users/santotia/Code/Mercedes/dh-io-domains/mbio-starter/spring/core');
      expect(getProjectPath(result, ':nonexistent')).toBeUndefined();
    });
  });
});