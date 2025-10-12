import { ProcessedModuleChange, CommitInfo } from '../adapters/core.js';
import { Config } from '../config/index.js';
import { HierarchyModuleManager } from '../adapters/hierarchy/hierarchyModuleManager.js';
export type VersionBumperOptions = {
    prereleaseMode: boolean;
    bumpUnchanged: boolean;
    addBuildMetadata: boolean;
    gradleSnapshot: boolean;
    adapter: string;
    timestampVersions: boolean;
    prereleaseId: string;
    repoRoot: string;
};
export declare class VersionBumper {
    private options;
    constructor(options: VersionBumperOptions);
    calculateVersionBumps(hierarchyManager: HierarchyModuleManager, moduleCommits: Map<string, CommitInfo[]>, config: Config): Promise<ProcessedModuleChange[]>;
    private calculateInitialBumps;
    private applyVersionCalculations;
}
//# sourceMappingURL=VersionBumper.d.ts.map