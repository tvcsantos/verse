import { ModuleSystemFactory } from "../module-system-factory.js";
import { ModuleDetector } from "../module-detector.js";
import { VersionUpdateStrategy } from "../version-update-strategy.js";
/**
 * Factory for creating Gradle-specific module system components.
 * Handles instantiation of Gradle module detector and version update strategy.
 */
export declare class GradleModuleSystemFactory implements ModuleSystemFactory {
    private readonly repoRoot;
    constructor(repoRoot: string);
    /**
     * Create a Gradle module detector.
     */
    createDetector(): ModuleDetector;
    /**
     * Create a Gradle version update strategy.
     */
    createVersionUpdateStrategy(): VersionUpdateStrategy;
}
//# sourceMappingURL=gradle-module-system-factory.d.ts.map