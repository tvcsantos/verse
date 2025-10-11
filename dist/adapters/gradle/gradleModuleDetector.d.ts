import { ModuleDetector } from '../core.js';
import { HierarchyModuleManager } from '../hierarchy/hierarchyModuleManager.js';
export declare class GradleModuleDetector implements ModuleDetector {
    readonly repoRoot: string;
    constructor(repoRoot: string);
    detect(): Promise<HierarchyModuleManager>;
}
//# sourceMappingURL=gradleModuleDetector.d.ts.map