import { describe, it, expect } from 'vitest';
import { 
  parseHierarchyStructure, 
  getDependentsOf, 
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
      expect(result.projectPaths).toHaveLength(5);
      expect(result.projectPaths).toContain(':');
      expect(result.projectPaths).toContain(':base');
      expect(result.projectPaths).toContain(':spring');
      expect(result.projectPaths).toContain(':spring:core');
      expect(result.projectPaths).toContain(':spring:servlet');
      expect(result.rootProject).toBe(':');
    });

    it('should build dependency relationships correctly', () => {
      const result = parseHierarchyStructure(sampleHierarchy);
      
      // Root project affects 4 subprojects
      const rootAffects = result.dependencies.filter(dep => dep.dependency === ':');
      expect(rootAffects).toHaveLength(4);
      expect(rootAffects.map(d => d.dependent)).toContain(':base');
      expect(rootAffects.map(d => d.dependent)).toContain(':spring');
      expect(rootAffects.map(d => d.dependent)).toContain(':spring:core');
      expect(rootAffects.map(d => d.dependent)).toContain(':spring:servlet');
      
      // Spring project affects 2 subprojects
      const springAffects = result.dependencies.filter(dep => dep.dependency === ':spring');
      expect(springAffects).toHaveLength(2);
      expect(springAffects.map(d => d.dependent)).toContain(':spring:core');
      expect(springAffects.map(d => d.dependent)).toContain(':spring:servlet');
      
      // Base has no affected subprojects
      const baseAffects = result.dependencies.filter(dep => dep.dependency === ':base');
      expect(baseAffects).toHaveLength(0);
    });
  });

  describe('getDependentsOf', () => {
    it('should return projects that depend on the given project', () => {
      const result = parseHierarchyStructure(sampleHierarchy);
      
      const rootDependents = getDependentsOf(result, ':');
      expect(rootDependents).toHaveLength(4);
      expect(rootDependents).toContain(':base');
      expect(rootDependents).toContain(':spring');
      expect(rootDependents).toContain(':spring:core');
      expect(rootDependents).toContain(':spring:servlet');
      
      const springDependents = getDependentsOf(result, ':spring');
      expect(springDependents).toHaveLength(2);
      expect(springDependents).toContain(':spring:core');
      expect(springDependents).toContain(':spring:servlet');
      
      const baseDependents = getDependentsOf(result, ':base');
      expect(baseDependents).toHaveLength(0);
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