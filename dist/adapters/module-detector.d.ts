import { ModuleManager } from "./module-manager";
export interface ModuleDetector {
    readonly repoRoot: string;
    /**
     * Detect all modules in the repository and return a hierarchy manager
     */
    detect(): Promise<ModuleManager>;
}
//# sourceMappingURL=module-detector.d.ts.map