import { ModuleChange, BumpType } from '../adapters/core.js';
import { HierarchyModuleManager } from '../adapters/hierarchy/hierarchyModuleManager.js';
export interface CascadeResult {
    changes: ModuleChange[];
    processed: Set<string>;
}
/**
 * Calculate cascade effects when modules change
 */
export declare function calculateCascadeEffects(moduleManager: HierarchyModuleManager, initialChanges: ModuleChange[], getDependencyBumpType: (dependencyBump: BumpType) => BumpType): CascadeResult;
//# sourceMappingURL=index.d.ts.map