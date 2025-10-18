import { ProcessingModuleChange, BumpType } from '../adapters/core.js';
import { ModuleManager } from '../adapters/hierarchy/module-manager.js';
/**
 * Calculate cascade effects when modules change.
 * Modifies the input array in place and returns all modules with cascade effects applied.
 */
export declare function calculateCascadeEffects(moduleManager: ModuleManager, allModuleChanges: ProcessingModuleChange[], getDependencyBumpType: (dependencyBump: BumpType) => BumpType): ProcessingModuleChange[];
//# sourceMappingURL=index.d.ts.map