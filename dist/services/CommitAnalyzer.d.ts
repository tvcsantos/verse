import { CommitInfo } from '../adapters/core.js';
import { HierarchyModuleManager } from '../adapters/hierarchy/hierarchyModuleManager.js';
export declare class CommitAnalyzer {
    private readonly repoRoot;
    constructor(repoRoot: string);
    analyzeCommitsSinceLastRelease(hierarchyManager: HierarchyModuleManager): Promise<Map<string, CommitInfo[]>>;
    /**
     * Find all child module paths for a given module.
     * Child modules are those whose path is a subdirectory of the parent module's path.
     */
    private findChildModulePaths;
    /**
     * Check if childPath is a subdirectory of parentPath
     */
    private isChildPath;
}
//# sourceMappingURL=commitAnalyzer.d.ts.map