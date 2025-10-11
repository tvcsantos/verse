import { ProcessingModuleChange, BumpType } from '../adapters/core.js';
import { HierarchyModuleManager } from '../adapters/hierarchy/hierarchyModuleManager.js';
/**
 * Calculate cascade effects when modules change.
 * Modifies the input array in place and returns all modules with cascade effects applied.
 */
export declare function calculateCascadeEffects(moduleManager: HierarchyModuleManager, allModuleChanges: ProcessingModuleChange[], getDependencyBumpType: (dependencyBump: BumpType) => BumpType): ProcessingModuleChange[];
//# sourceMappingURL=index.d.ts.map