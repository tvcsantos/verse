import { ModuleDetector } from "../module-detector.js";
import { ModuleManager } from '../module-manager.js';
export declare class GradleModuleDetector implements ModuleDetector {
    readonly repoRoot: string;
    constructor(repoRoot: string);
    detect(): Promise<ModuleManager>;
}
//# sourceMappingURL=gradle-module-detector.d.ts.map