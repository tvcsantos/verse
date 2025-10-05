import { describe, it, expect } from 'vitest';
import { buildDependencyGraph, topologicalSort, calculateCascadeEffects } from '../src/graph/index.js';
import { Module, DependencyRef, ModuleChange } from '../src/adapters/core.js';

describe('Dependency Graph', () => {
  const modules: Module[] = [
    { name: 'root', path: '/root', relativePath: '.', type: 'root' },
    { name: 'core', path: '/core', relativePath: 'core', type: 'module' },
    { name: 'utils', path: '/utils', relativePath: 'utils', type: 'module' },
    { name: 'api', path: '/api', relativePath: 'api', type: 'module' },
  ];

  const getDependencies = async (module: Module): Promise<DependencyRef[]> => {
    const deps: Record<string, DependencyRef[]> = {
      root: [],
      core: [
        { name: 'utils', type: 'project', scope: 'implementation' },
      ],
      utils: [],
      api: [
        { name: 'core', type: 'project', scope: 'implementation' },
        { name: 'utils', type: 'project', scope: 'implementation' },
      ],
    };
    return deps[module.name] || [];
  };

  describe('buildDependencyGraph', () => {
    it('should build correct dependency graph', async () => {
      const graph = await buildDependencyGraph(modules, getDependencies);
      
      expect(graph.modules).toEqual(modules);
      expect(graph.dependencies.get('api')).toEqual([
        { name: 'core', type: 'project', scope: 'implementation' },
        { name: 'utils', type: 'project', scope: 'implementation' },
      ]);
      expect(graph.dependents.get('utils')).toEqual(['core', 'api']);
    });
  });

  describe('topologicalSort', () => {
    it('should sort modules in dependency order', async () => {
      const graph = await buildDependencyGraph(modules, getDependencies);
      const sorted = topologicalSort(graph);
      
      const moduleNames = sorted.map(m => m.name);
      
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
          module: modules.find(m => m.name === 'utils')!,
          fromVersion: { major: 1, minor: 0, patch: 0 },
          toVersion: { major: 1, minor: 1, patch: 0 },
          bumpType: 'minor',
          reason: 'commits',
        },
      ];

      const getDependencyBumpType = () => 'patch';
      
      const result = calculateCascadeEffects(graph, initialChanges, getDependencyBumpType);
      
      // Should have cascaded to core and api
      expect(result.changes).toHaveLength(3); // utils + core + api
      expect(result.processed.has('core')).toBe(true);
      expect(result.processed.has('api')).toBe(true);
    });
  });
});