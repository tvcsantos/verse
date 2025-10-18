import { ModuleDetector } from '../core.js';
import { ModuleManager } from '../hierarchy/module-manager.js';
export declare class GradleModuleDetector implements ModuleDetector {
    readonly repoRoot: string;
    constructor(repoRoot: string);
    detect(): Promise<ModuleManager>;
}
//# sourceMappingURL=gradle-module-detector.d.ts.map