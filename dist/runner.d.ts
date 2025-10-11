import { BumpType } from './adapters/core.js';
export type RunnerOptions = {
    readonly repoRoot: string;
    readonly adapter: string;
    readonly configPath: string;
    readonly releaseBranches: string[];
    readonly dryRun: boolean;
    readonly createReleases: boolean;
    readonly pushTags: boolean;
    readonly fetchDepth: number;
    readonly prereleaseMode: boolean;
    readonly prereleaseId: string;
    readonly bumpUnchanged: boolean;
    readonly addBuildMetadata: boolean;
    readonly timestampVersions: boolean;
    readonly gradleSnapshot: boolean;
    readonly pushChanges: boolean;
};
export type ModuleChangeResult = {
    readonly id: string;
    readonly from: string;
    readonly to: string;
    readonly bumpType: BumpType;
};
export type RunnerResult = {
    readonly bumped: boolean;
    readonly changedModules: Array<ModuleChangeResult>;
    readonly createdTags: string[];
    readonly changelogPaths: string[];
    readonly manifestPath?: string;
};
export declare class VerseRunner {
    private moduleSystemFactory;
    private hierarchyManager;
    private versionManager;
    private config;
    private options;
    constructor(options: RunnerOptions);
    run(): Promise<RunnerResult>;
}
