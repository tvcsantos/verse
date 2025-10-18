import { ModuleDetector } from "../module-detector.js";
import { ProjectHierarchy } from '../hierarchy.js';
import { ModuleManager } from '../module-manager.js';
import { 
  executeGradleHierarchyCommand,
  parseHierarchyStructure 
} from './hierarchy-dependencies.js';

export class GradleModuleDetector implements ModuleDetector {
  constructor(readonly repoRoot: string) {
  }

  async detect(): Promise<ModuleManager> {
    const hierarchyJson = await executeGradleHierarchyCommand(this.repoRoot);
    const hierarchy: ProjectHierarchy = JSON.parse(hierarchyJson);
    
    const hierarchyResult = parseHierarchyStructure(hierarchy);
    return new ModuleManager(hierarchyResult);
  }
}
