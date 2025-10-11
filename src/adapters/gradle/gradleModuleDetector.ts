import { ModuleDetector } from '../core.js';
import { ProjectHierarchy } from '../hierarchy.js';
import { HierarchyModuleManager } from '../hierarchy/hierarchyModuleManager.js';
import { 
  executeGradleHierarchyCommand,
  parseHierarchyStructure 
} from './parsers/hierarchyDependencies.js';

export class GradleModuleDetector implements ModuleDetector {
  constructor(readonly repoRoot: string) {
  }

  async detect(): Promise<HierarchyModuleManager> {
    const hierarchyJson = await executeGradleHierarchyCommand(this.repoRoot);
    const hierarchy: ProjectHierarchy = JSON.parse(hierarchyJson);
    
    const hierarchyResult = parseHierarchyStructure(hierarchy, this.repoRoot);
    return new HierarchyModuleManager(hierarchyResult);
  }
}