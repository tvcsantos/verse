import { Module, DependencyRef, ModuleChange, BumpType } from '../adapters/core.js';
import { parseSemVer } from '../semver/index.js';

export interface DependencyGraph {
  modules: Module[];
  dependencies: Map<string, DependencyRef[]>;
  dependents: Map<string, string[]>;
}

export interface CascadeResult {
  changes: ModuleChange[];
  processed: Set<string>;
}

/**
 * Build a dependency graph from modules and their dependencies
 */
export function buildDependencyGraph(
  modules: Module[],
  getDependencies: (module: Module) => Promise<DependencyRef[]>
): Promise<DependencyGraph> {
  return new Promise(async (resolve) => {
    const dependencies = new Map<string, DependencyRef[]>();
    const dependents = new Map<string, string[]>();

    // Initialize dependents map
    for (const module of modules) {
      dependents.set(module.name, []);
    }

    // Build dependencies and reverse dependencies
    for (const module of modules) {
      const moduleDeps = await getDependencies(module);
      dependencies.set(module.name, moduleDeps);

      // Build reverse dependencies (dependents)
      for (const dep of moduleDeps) {
        const depDependents = dependents.get(dep.name) || [];
        depDependents.push(module.name);
        dependents.set(dep.name, depDependents);
      }
    }

    resolve({
      modules,
      dependencies,
      dependents,
    });
  });
}

/**
 * Perform topological sort of modules based on dependencies
 */
export function topologicalSort(graph: DependencyGraph): Module[] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: Module[] = [];
  const moduleMap = new Map(graph.modules.map(m => [m.name, m]));

  function visit(moduleName: string): void {
    if (visited.has(moduleName)) {
      return;
    }

    if (visiting.has(moduleName)) {
      throw new Error(`Circular dependency detected involving module: ${moduleName}`);
    }

    visiting.add(moduleName);

    // Visit dependencies first
    const deps = graph.dependencies.get(moduleName) || [];
    for (const dep of deps) {
      if (moduleMap.has(dep.name)) {
        visit(dep.name);
      }
    }

    visiting.delete(moduleName);
    visited.add(moduleName);

    const module = moduleMap.get(moduleName);
    if (module) {
      result.push(module);
    }
  }

  // Visit all modules
  for (const module of graph.modules) {
    if (!visited.has(module.name)) {
      visit(module.name);
    }
  }

  return result;
}

/**
 * Calculate cascade effects when modules change
 */
export function calculateCascadeEffects(
  graph: DependencyGraph,
  initialChanges: ModuleChange[],
  getDependencyBumpType: (moduleName: string, dependencyBump: BumpType) => BumpType
): CascadeResult {
  const changes = [...initialChanges];
  const processed = new Set<string>();
  const changeMap = new Map<string, ModuleChange>();

  // Index initial changes
  for (const change of initialChanges) {
    changeMap.set(change.module.name, change);
    processed.add(change.module.name);
  }

  const queue = [...initialChanges];

  while (queue.length > 0) {
    const currentChange = queue.shift()!;
    const dependents = graph.dependents.get(currentChange.module.name) || [];

    for (const dependentName of dependents) {
      if (processed.has(dependentName)) {
        continue; // Already processed this module
      }

      const dependentModule = graph.modules.find(m => m.name === dependentName);
      if (!dependentModule) {
        continue;
      }

      // Calculate the bump needed for the dependent
      const requiredBump = getDependencyBumpType(dependentName, currentChange.bumpType);
      
      if (requiredBump === 'none') {
        continue; // No cascade needed
      }

      // Check if we already have a change for this module
      const existingChange = changeMap.get(dependentName);
      if (existingChange) {
        // Merge with existing change if this bump is higher
        const mergedBump = maxBumpType([existingChange.bumpType, requiredBump]);
        if (mergedBump !== existingChange.bumpType) {
          existingChange.bumpType = mergedBump;
          queue.push(existingChange); // Re-process with new bump type
        }
      } else {
        // Create new cascade change
        const cascadeChange: ModuleChange = {
          module: dependentModule,
          fromVersion: parseSemVer('0.0.0'), // Will be filled in by caller
          toVersion: parseSemVer('0.0.0'), // Will be filled in by caller
          bumpType: requiredBump,
          reason: 'cascade',
        };

        changes.push(cascadeChange);
        changeMap.set(dependentName, cascadeChange);
        queue.push(cascadeChange);
      }

      processed.add(dependentName);
    }
  }

  return {
    changes,
    processed,
  };
}

/**
 * Find all modules that depend on a given module
 */
export function findAllDependents(
  graph: DependencyGraph,
  moduleName: string,
  visited = new Set<string>()
): string[] {
  if (visited.has(moduleName)) {
    return [];
  }

  visited.add(moduleName);
  const directDependents = graph.dependents.get(moduleName) || [];
  const allDependents = [...directDependents];

  for (const dependent of directDependents) {
    const transitiveDependents = findAllDependents(graph, dependent, visited);
    allDependents.push(...transitiveDependents);
  }

  return [...new Set(allDependents)];
}

/**
 * Find all modules that a given module depends on
 */
export function findAllDependencies(
  graph: DependencyGraph,
  moduleName: string,
  visited = new Set<string>()
): string[] {
  if (visited.has(moduleName)) {
    return [];
  }

  visited.add(moduleName);
  const directDeps = graph.dependencies.get(moduleName) || [];
  const projectDeps = directDeps.map(dep => dep.name);
  const allDeps = [...projectDeps];

  for (const dep of projectDeps) {
    const transitiveDeps = findAllDependencies(graph, dep, visited);
    allDeps.push(...transitiveDeps);
  }

  return [...new Set(allDeps)];
}

/**
 * Check if module A depends on module B (directly or transitively)
 */
export function dependsOn(
  graph: DependencyGraph,
  moduleA: string,
  moduleB: string
): boolean {
  const dependencies = findAllDependencies(graph, moduleA);
  return dependencies.includes(moduleB);
}

/**
 * Get the maximum bump type from an array of bump types
 */
function maxBumpType(bumpTypes: BumpType[]): BumpType {
  const priority = { none: 0, patch: 1, minor: 2, major: 3 };
  
  return bumpTypes.reduce((max, current) => {
    return priority[current] > priority[max] ? current : max;
  }, 'none' as BumpType);
}

/**
 * Validate that the dependency graph is acyclic
 */
export function validateAcyclic(graph: DependencyGraph): void {
  try {
    topologicalSort(graph);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Circular dependency')) {
      throw error;
    }
    throw new Error('Failed to validate dependency graph');
  }
}