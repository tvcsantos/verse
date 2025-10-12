import { CommitInfo } from '../adapters/core.js';
import { ModuleChangeResult } from './versionApplier.js';
export type ChangelogGeneratorOptions = {
    repoRoot: string;
    dryRun: boolean;
};
export declare class ChangelogGenerator {
    private options;
    constructor(options: ChangelogGeneratorOptions);
    generateChangelogs(moduleResults: ModuleChangeResult[], moduleCommits: Map<string, CommitInfo[]>): Promise<string[]>;
}
//# sourceMappingURL=changelogGenerator.d.ts.map