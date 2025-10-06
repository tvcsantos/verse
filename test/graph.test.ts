import { describe, it, expect } from 'vitest';
import { calculateCascadeEffects } from '../src/graph/index.js';
import { ModuleChange, BumpType } from '../src/adapters/core.js';
import { HierarchyParseResult } from '../src/adapters/hierarchy.js';
import { parseSemVer } from '../src/semver/index.js';
import { HierarchyModuleManager } from '../src/adapters/hierarchy/hierarchyModuleManager.js';

describe('Cascade Effects', () => {
  const hierarchyResult: HierarchyParseResult = {
    projectIds: ['root', 'core', 'utils', 'api'],
    projectMap: new Map([
      ['root', { id: 'root', path: '.', type: 'root', affectedProjects: new Set(['core', 'utils', 'api']), version: parseSemVer('1.0.0') }],
      ['core', { id: 'core', path: 'core', type: 'module', affectedProjects: new Set(['api']), version: parseSemVer('1.0.0') }],
      ['utils', { id: 'utils', path: 'utils', type: 'module', affectedProjects: new Set(['core', 'api']), version: parseSemVer('1.0.0') }],
      ['api', { id: 'api', path: 'api', type: 'module', affectedProjects: new Set(), version: parseSemVer('1.0.0') }],
    ]),
    rootProject: 'root',
  };

  describe('calculateCascadeEffects', () => {
    it('should calculate cascade effects correctly', () => {
      const utilsProjectInfo = hierarchyResult.projectMap.get('utils')!;

      const initialChanges: ModuleChange[] = [
        {
          module: utilsProjectInfo,
          fromVersion: parseSemVer('1.0.0'),
          toVersion: parseSemVer('1.1.0'),
          bumpType: 'minor',
          reason: 'commits',
        },
      ];

      // Mock module manager for the test
      const mockModuleManager = {
        getModuleInfo: (moduleId: string) => {
          const info = hierarchyResult.projectMap.get(moduleId);
          if (!info) {
            throw new Error(`Module ${moduleId} not found`);
          }
          return info;
        }
      } as HierarchyModuleManager;

      const getDependencyBumpType = (): BumpType => 'patch';
      
      const result = calculateCascadeEffects(mockModuleManager, initialChanges, getDependencyBumpType);
      
      // Should have cascaded to core and api
      expect(result.changes).toHaveLength(3); // utils + core + api
      expect(result.processed.has('core')).toBe(true);
      expect(result.processed.has('api')).toBe(true);
    });
  });
});