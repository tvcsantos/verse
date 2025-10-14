import { CommitInfo } from '../adapters/core.js';
import { HierarchyModuleManager } from '../adapters/hierarchy/hierarchyModuleManager.js';
export declare class CommitAnalyzer {
    private readonly repoRoot;
    constructor(repoRoot: string);
    analyzeCommitsSinceLastRelease(hierarchyManager: HierarchyModuleManager): Promise<Map<string, CommitInfo[]>>;
}
//# sourceMappingURL=commitAnalyzer.d.ts.map