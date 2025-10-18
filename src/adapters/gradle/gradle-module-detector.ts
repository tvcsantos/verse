import { ModuleDetector } from '../core.js';
import { ProjectHierarchy } from '../hierarchy.js';
import { ModuleManager } from '../hierarchy/module-manager.js';
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
