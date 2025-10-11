import { HierarchyParseResult, ProjectInfo } from '../hierarchy.js';

/**
 * Concrete class for managing hierarchy data.
 * Handles hierarchy operations independent of any build system.
 */
export class HierarchyModuleManager {
  constructor(private readonly hierarchyResult: HierarchyParseResult) {}

  /**
   * Get all module IDs in the project
   */
  getModuleIds(): string[] {
    return this.hierarchyResult.projectIds;
  }

  /**
   * Get module information by ID (includes current version)
   */
  getModuleInfo(moduleId: string): ProjectInfo {
    const projectInfo = this.hierarchyResult.projectMap.get(moduleId);
    if (!projectInfo) {
      throw new Error(`Module ${moduleId} not found`);
    }
    return projectInfo;
  }

  hasModule(moduleId: string): boolean {
    return this.hierarchyResult.projectMap.has(moduleId);
  }

  /**
   * Get all modules as a map (each ProjectInfo includes current version)
   */
  getModules(): ReadonlyMap<string, ProjectInfo> {
    return this.hierarchyResult.projectMap;
  }
}