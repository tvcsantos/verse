import { describe, it, expect } from 'vitest';
import { 
  parseHierarchyStructure, 
} from '../src/adapters/gradle/parsers/hierarchyDependencies.js';
import { ProjectHierarchy } from '../src/adapters/hierarchy.js';

describe('Hierarchy Dependencies Parser', () => {
  const sampleHierarchy: ProjectHierarchy = {
    ":": {
      path: ".",
      affectedSubprojects: [":base", ":spring", ":spring:core", ":spring:servlet"],
      version: "1.0.0",
      type: "root"
    },
    ":base": {
      path: "base",
      affectedSubprojects: [],
      version: "1.1.0",
      type: "module"
    },
    ":spring": {
      path: "spring",
      affectedSubprojects: [":spring:core", ":spring:servlet"],
      version: "2.0.0",
      type: "module"
    },
    ":spring:core": {
      path: "spring/core",
      affectedSubprojects: [],
      version: "2.1.0",
      type: "module"
    },
    ":spring:servlet": {
      path: "spring/servlet",
      affectedSubprojects: [],
      version: "2.2.0",
      type: "module"
    }
  };

  describe('parseHierarchyStructure', () => {
    it('should parse hierarchy structure correctly', () => {
      const result = parseHierarchyStructure(sampleHierarchy, '/test-repo');
      
      expect(result.projectIds).toHaveLength(5);
      expect(result.projectIds).toContain(':');
      expect(result.projectIds).toContain(':base');
      expect(result.projectIds).toContain(':spring');
      expect(result.projectIds).toContain(':spring:core');
      expect(result.projectIds).toContain(':spring:servlet');
      expect(result.rootProject).toBe(':');
      
      // Verify projectMap contains correct paths
      expect(result.projectMap.get(':')?.path).toBe('.');
      expect(result.projectMap.get(':base')?.path).toBe('base');
      expect(result.projectMap.get(':spring:core')?.path).toBe('spring/core');
    });

    it('should build affected project relationships correctly', () => {
      const result = parseHierarchyStructure(sampleHierarchy, '/test-repo');
      
      // Verify that affected projects are properly stored in the projectMap
      // Root affects all subprojects
      expect(result.projectMap.get(':')?.affectedProjects.has(':base')).toBe(true);
      expect(result.projectMap.get(':')?.affectedProjects.has(':spring')).toBe(true);
      expect(result.projectMap.get(':')?.affectedProjects.has(':spring:core')).toBe(true);
      expect(result.projectMap.get(':')?.affectedProjects.has(':spring:servlet')).toBe(true);
      
      // Spring affects its subprojects
      expect(result.projectMap.get(':spring')?.affectedProjects.has(':spring:core')).toBe(true);
      expect(result.projectMap.get(':spring')?.affectedProjects.has(':spring:servlet')).toBe(true);
      
      // Leaf projects affect nothing
      expect(result.projectMap.get(':base')?.affectedProjects.size).toBe(0);
      expect(result.projectMap.get(':spring:core')?.affectedProjects.size).toBe(0);
      expect(result.projectMap.get(':spring:servlet')?.affectedProjects.size).toBe(0);
    });

    it('should parse versions correctly from ProjectNode', () => {
      const result = parseHierarchyStructure(sampleHierarchy, '/test-repo');
      
      // Verify that versions are correctly parsed from the hierarchy
      expect(result.projectMap.get(':')?.version.version).toBe('1.0.0');
      expect(result.projectMap.get(':base')?.version.version).toBe('1.1.0');
      expect(result.projectMap.get(':spring')?.version.version).toBe('2.0.0');
      expect(result.projectMap.get(':spring:core')?.version.version).toBe('2.1.0');
      expect(result.projectMap.get(':spring:servlet')?.version.version).toBe('2.2.0');
    });

    it('should parse types correctly from ProjectNode', () => {
      const result = parseHierarchyStructure(sampleHierarchy, '/test-repo');
      
      // Verify that types are correctly parsed from the hierarchy
      expect(result.projectMap.get(':')?.type).toBe('root');
      expect(result.projectMap.get(':base')?.type).toBe('module');
      expect(result.projectMap.get(':spring')?.type).toBe('module');
      expect(result.projectMap.get(':spring:core')?.type).toBe('module');
      expect(result.projectMap.get(':spring:servlet')?.type).toBe('module');
      
      // Verify root project detection
      expect(result.rootProject).toBe(':');
    });

    it('should throw error when no root project is found', () => {
      const hierarchyWithoutRoot: ProjectHierarchy = {
        ":base": {
          path: "base",
          affectedSubprojects: [],
          version: "1.1.0",
          type: "module"
        },
        ":spring": {
          path: "spring",
          affectedSubprojects: [],
          version: "2.0.0",
          type: "module"
        }
      };

      expect(() => {
        parseHierarchyStructure(hierarchyWithoutRoot, '/test-repo');
      }).toThrow('No root project found in hierarchy. Every project hierarchy must contain exactly one project with type "root".');
    });
  });
});