import { BumpType } from './adapters/core.js';
export interface RunnerOptions {
    repoRoot: string;
    adapter: string;
    configPath: string;
    releaseBranches: string[];
    dryRun: boolean;
    createReleases: boolean;
    pushTags: boolean;
    fetchDepth: number;
    prereleaseMode: boolean;
    prereleaseId: string;
    bumpUnchanged: boolean;
    addBuildMetadata: boolean;
}
export interface RunnerResult {
    bumped: boolean;
    changedModules: Array<{
        id: string;
        from: string;
        to: string;
        bumpType: BumpType;
    }>;
    createdTags: string[];
    changelogPaths: string[];
    manifestPath?: string;
}
export declare class MonorepoVersionRunner {
    private moduleSystemFactory;
    private hierarchyManager;
    private versionManager;
    private config;
    private options;
    constructor(options: RunnerOptions);
    run(): Promise<RunnerResult>;
}
