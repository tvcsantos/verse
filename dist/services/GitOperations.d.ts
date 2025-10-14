import { ModuleChangeResult } from './versionApplier.js';
export type GitOperationsOptions = {
    pushChanges: boolean;
    pushTags: boolean;
    repoRoot: string;
    dryRun: boolean;
};
export declare class GitOperations {
    private readonly options;
    constructor(options: GitOperationsOptions);
    commitAndPushChanges(moduleChangeResults: ModuleChangeResult[]): Promise<void>;
    createAndPushTags(moduleChangeResults: ModuleChangeResult[]): Promise<string[]>;
    private createCommitMessage;
}
//# sourceMappingURL=gitOperations.d.ts.map