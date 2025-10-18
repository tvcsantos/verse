import { describe, it, expect } from 'vitest';
import { calculateCascadeEffects } from '../src/graph/index.js';
import { ProcessingModuleChange, BumpType } from '../src/adapters/core.js';
import { HierarchyParseResult } from '../src/adapters/hierarchy.js';
import { parseSemVer } from '../src/semver/index.js';
import { ModuleManager } from '../src/adapters/hierarchy/module-manager.js';

describe('Cascade Effects', () => {
  const hierarchyResult: HierarchyParseResult = {
    projectIds: ['root', 'core', 'utils', 'api'],
    projectMap: new Map([
      ['root', { id: 'root', name: 'root', path: '.', type: 'root', affectedProjects: new Set(['core', 'utils', 'api']), version: parseSemVer('1.0.0'), declaredVersion: true }],
      ['core', { id: 'core', name: 'core', path: 'core', type: 'module', affectedProjects: new Set(['api']), version: parseSemVer('1.0.0'), declaredVersion: true }],
      ['utils', { id: 'utils', name: 'utils', path: 'utils', type: 'module', affectedProjects: new Set(['core', 'api']), version: parseSemVer('1.0.0'), declaredVersion: true }],
      ['api', { id: 'api', name: 'api', path: 'api', type: 'module', affectedProjects: new Set(), version: parseSemVer('1.0.0'), declaredVersion: true }],
    ]),
    rootProject: 'root',
  };

  describe('calculateCascadeEffects', () => {
    it('should calculate cascade effects correctly', () => {
      const utilsProjectInfo = hierarchyResult.projectMap.get('utils')!;

      const allModuleChanges: ProcessingModuleChange[] = [
        // Utils module has changes and needs processing
        {
          module: utilsProjectInfo,
          fromVersion: parseSemVer('1.0.0'),
          toVersion: '1.1.0',
          bumpType: 'minor',
          reason: 'commits',
          needsProcessing: true,
        },
        // Core module - initially no changes
        {
          module: hierarchyResult.projectMap.get('core')!,
          fromVersion: parseSemVer('1.0.0'),
          toVersion: '1.0.0',
          bumpType: 'none',
          reason: 'unchanged',
          needsProcessing: false,
        },
        // API module - initially no changes
        {
          module: hierarchyResult.projectMap.get('api')!,
          fromVersion: parseSemVer('1.0.0'),
          toVersion: '1.0.0',
          bumpType: 'none',
          reason: 'unchanged',
          needsProcessing: false,
        },
        // Root module - initially no changes
        {
          module: hierarchyResult.projectMap.get('root')!,
          fromVersion: parseSemVer('1.0.0'),
          toVersion: '1.0.0',
          bumpType: 'none',
          reason: 'unchanged',
          needsProcessing: false,
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
      } as ModuleManager;

      const getDependencyBumpType = (): BumpType => 'patch';
      
      const result = calculateCascadeEffects(mockModuleManager, allModuleChanges, getDependencyBumpType);
      
      // Should have modified the array in place
      expect(result).toBe(allModuleChanges); // Same array reference
      
      // Should have cascaded to core and api
      const changedModules = result.filter(change => change.needsProcessing);
      expect(changedModules.length).toBeGreaterThanOrEqual(3); // utils + core + api (at least)
      
      // Find the specific modules that should have been cascaded
      const coreChange = result.find(change => change.module.id === 'core');
      const apiChange = result.find(change => change.module.id === 'api');
      
      expect(coreChange?.needsProcessing).toBe(true);
      expect(coreChange?.reason).toBe('cascade');
      expect(apiChange?.needsProcessing).toBe(true);
      expect(apiChange?.reason).toBe('cascade');
    });
  });
});