import { describe, it, expect } from 'vitest';
import { buildDependencyGraph, topologicalSort, calculateCascadeEffects } from '../src/graph/index.js';
import { Module, DependencyRef, ModuleChange, BumpType } from '../src/adapters/core.js';
import { parseSemVer } from '../src/semver/index.js';

describe('Dependency Graph', () => {
  const modules: Module[] = [
    { id: 'root', path: '/root', relativePath: '.', type: 'root' },
    { id: 'core', path: '/core', relativePath: 'core', type: 'module' },
    { id: 'utils', path: '/utils', relativePath: 'utils', type: 'module' },
    { id: 'api', path: '/api', relativePath: 'api', type: 'module' },
  ];

  const getDependencies = async (module: Module): Promise<DependencyRef[]> => {
    const deps: Record<string, DependencyRef[]> = {
      root: [],
      core: [
        { id: 'utils' },
      ],
      utils: [],
      api: [
        { id: 'core' },
        { id: 'utils' },
      ],
    };
    return deps[module.id] || [];
  };

  describe('buildDependencyGraph', () => {
    it('should build correct dependency graph', async () => {
      const graph = await buildDependencyGraph(modules, getDependencies);
      
      expect(graph.modules).toEqual(modules);
      expect(graph.dependencies.get('api')).toEqual([
        { id: 'core' },
        { id: 'utils' },
      ]);
      expect(graph.dependents.get('utils')).toEqual(['core', 'api']);
    });
  });

  describe('topologicalSort', () => {
    it('should sort modules in dependency order', async () => {
      const graph = await buildDependencyGraph(modules, getDependencies);
      const sorted = topologicalSort(graph);
      
      const moduleNames = sorted.map(m => m.id);
      
      // utils should come before core and api
      expect(moduleNames.indexOf('utils')).toBeLessThan(moduleNames.indexOf('core'));
      expect(moduleNames.indexOf('utils')).toBeLessThan(moduleNames.indexOf('api'));
      
      // core should come before api
      expect(moduleNames.indexOf('core')).toBeLessThan(moduleNames.indexOf('api'));
    });
  });

  describe('calculateCascadeEffects', () => {
    it('should calculate cascade effects correctly', async () => {
      const graph = await buildDependencyGraph(modules, getDependencies);
      
      const initialChanges: ModuleChange[] = [
        {
          module: modules.find(m => m.id === 'utils')!,
          fromVersion: parseSemVer('1.0.0'),
          toVersion: parseSemVer('1.1.0'),
          bumpType: 'minor',
          reason: 'commits',
        },
      ];

      const getDependencyBumpType = (): BumpType => 'patch';
      
      const result = calculateCascadeEffects(graph, initialChanges, getDependencyBumpType);
      
      // Should have cascaded to core and api
      expect(result.changes).toHaveLength(3); // utils + core + api
      expect(result.processed.has('core')).toBe(true);
      expect(result.processed.has('api')).toBe(true);
    });
  });
});