import { HierarchyParseResult, ProjectInfo } from '../hierarchy.js';
/**
 * Concrete class for managing hierarchy data.
 * Handles hierarchy operations independent of any build system.
 */
export declare class HierarchyModuleManager {
    private readonly hierarchyResult;
    constructor(hierarchyResult: HierarchyParseResult);
    /**
     * Get all module IDs in the project
     */
    getModuleIds(): string[];
    /**
     * Get module information by ID (includes current version)
     */
    getModuleInfo(moduleId: string): ProjectInfo;
    hasModule(moduleId: string): boolean;
    /**
     * Get all modules as a map (each ProjectInfo includes current version)
     */
    getModules(): ReadonlyMap<string, ProjectInfo>;
}
//# sourceMappingURL=hierarchy-module-manager.d.ts.map