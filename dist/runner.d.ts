import { ModuleChangeResult } from './services/versionApplier.js';
import { ProjectInfo } from './adapters/hierarchy.js';
export type RunnerOptions = {
    readonly repoRoot: string;
    readonly adapter?: string;
    readonly configPath?: string;
    readonly dryRun: boolean;
    readonly createReleases: boolean;
    readonly pushTags: boolean;
    readonly prereleaseMode: boolean;
    readonly prereleaseId: string;
    readonly bumpUnchanged: boolean;
    readonly addBuildMetadata: boolean;
    readonly timestampVersions: boolean;
    readonly gradleSnapshot: boolean;
    readonly pushChanges: boolean;
    readonly generateChangelog: boolean;
};
export type RunnerResult = {
    readonly bumped: boolean;
    readonly discoveredModules: Array<ProjectInfo>;
    readonly changedModules: Array<ModuleChangeResult>;
    readonly createdTags: string[];
    readonly changelogPaths: string[];
};
export declare class VerseRunner {
    private moduleSystemFactory;
    private hierarchyManager;
    private versionManager;
    private config;
    private adapter;
    private options;
    private configurationLoader;
    private commitAnalyzer;
    private versionBumper;
    private versionApplier;
    private changelogGenerator;
    private gitOperations;
    constructor(options: RunnerOptions);
    run(): Promise<RunnerResult>;
}
