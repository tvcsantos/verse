import * as core from '@actions/core';
import { ModuleSystemFactory } from './adapters/core.js';
import { HierarchyModuleManager } from './adapters/hierarchy/hierarchyModuleManager.js';
import { VersionManager } from './adapters/versionManager.js';
import { createModuleSystemFactory } from './factories/moduleSystemFactory.js';
import { Config } from './config/index.js';
import { 
  getCurrentBranch,
  isWorkingDirectoryClean
} from './git/index.js';

// Service imports
import { ConfigurationLoader } from './services/configurationLoader.js';
import { CommitAnalyzer } from './services/commitAnalyzer.js';
import { VersionBumper, VersionBumperOptions } from './services/versionBumper.js';
import { VersionApplier, VersionApplierOptions, ModuleChangeResult } from './services/versionApplier.js';
import { ChangelogGenerator } from './services/changelogGenerator.js';
import { GitOperations, GitOperationsOptions } from './services/gitOperations.js';

export type RunnerOptions = {
  readonly repoRoot: string;
  readonly adapter: string;
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
};

export type RunnerResult = {
  readonly bumped: boolean;
  readonly changedModules: Array<ModuleChangeResult>;
  readonly createdTags: string[];
  readonly changelogPaths: string[];
};

export class VerseRunner {
  private moduleSystemFactory: ModuleSystemFactory;
  private hierarchyManager!: HierarchyModuleManager; // Will be initialized in run()
  private versionManager!: VersionManager; // Will be initialized in run()
  private config!: Config; // Will be initialized in run()
  private options: RunnerOptions;

  // Service instances
  private configurationLoader: ConfigurationLoader;
  private commitAnalyzer: CommitAnalyzer;
  private versionBumper!: VersionBumper; // Will be initialized in run()
  private versionApplier!: VersionApplier; // Will be initialized in run()
  private changelogGenerator: ChangelogGenerator;
  private gitOperations!: GitOperations; // Will be initialized in run()

  constructor(options: RunnerOptions) {
    this.options = options;
    this.moduleSystemFactory = createModuleSystemFactory(options.adapter, options.repoRoot);
    
    // Initialize services
    this.configurationLoader = new ConfigurationLoader();
    this.commitAnalyzer = new CommitAnalyzer(options.repoRoot);
    this.changelogGenerator = new ChangelogGenerator({
      repoRoot: options.repoRoot,
      dryRun: options.dryRun
    });
  }

  async run(): Promise<RunnerResult> {
    core.info('🏃 Running VERSE semantic evolution pipeline...');
    
    // Load configuration
    this.config = await this.configurationLoader.loadConfiguration(
      this.options.configPath, 
      this.options.repoRoot
    );

    // Check if we're on a release branch
    const currentBranch = await getCurrentBranch({ cwd: this.options.repoRoot });
    if (!this.config.releaseBranches.includes(currentBranch)) {
      core.info(`⚠️  Not on a release branch (current: ${currentBranch}, release branches: ${this.config.releaseBranches.join(', ')}), skipping versioning`);
      return {
        bumped: false,
        changedModules: [],
        createdTags: [],
        changelogPaths: [],
      };
    }

    // Check if working directory is clean
    if (!this.options.dryRun && !isWorkingDirectoryClean({ cwd: this.options.repoRoot })) {
      throw new Error('Working directory is not clean. Please commit or stash your changes.');
    }

    // Discover modules and get hierarchy manager
    core.info('🔍 Discovering modules...');
    const detector = this.moduleSystemFactory.createDetector();
    this.hierarchyManager = await detector.detect();
    
    // Create version manager  
    const versionUpdateStrategy = this.moduleSystemFactory.createVersionUpdateStrategy();
    this.versionManager = new VersionManager(this.hierarchyManager, versionUpdateStrategy);
    
    // Log discovered modules through hierarchy manager
    const moduleIds = this.hierarchyManager.getModuleIds();
    core.info(`Found ${moduleIds.length} modules: ${moduleIds.join(', ')}`);

    // Analyze commits since last release
    const moduleCommits = await this.commitAnalyzer.analyzeCommitsSinceLastRelease(
      this.hierarchyManager
    );

    // Initialize version bumper service
    const versionBumperOptions: VersionBumperOptions = {
      prereleaseMode: this.options.prereleaseMode,
      bumpUnchanged: this.options.bumpUnchanged,
      addBuildMetadata: this.options.addBuildMetadata,
      gradleSnapshot: this.options.gradleSnapshot,
      adapter: this.options.adapter,
      timestampVersions: this.options.timestampVersions,
      prereleaseId: this.options.prereleaseId,
      repoRoot: this.options.repoRoot
    };
    this.versionBumper = new VersionBumper(versionBumperOptions);

    // Calculate version bumps with cascade effects
    const processedModuleChanges = await this.versionBumper.calculateVersionBumps(
      this.hierarchyManager,
      moduleCommits,
      this.config
    );
    
    if (processedModuleChanges.length === 0) {
      core.info('✨ No version changes needed');
      return {
        bumped: false,
        changedModules: [],
        createdTags: [],
        changelogPaths: [],
      };
    }

    // Initialize version applier and apply changes
    const versionApplierOptions: VersionApplierOptions = {
      dryRun: this.options.dryRun
    };
    this.versionApplier = new VersionApplier(this.versionManager, versionApplierOptions);
    const changedModules = await this.versionApplier.applyVersionChanges(processedModuleChanges);

    // Generate changelogs
    const changelogPaths = await this.changelogGenerator.generateChangelogs(
      changedModules, 
      moduleCommits
    );

    // Initialize git operations service
    const gitOperationsOptions: GitOperationsOptions = {
      pushChanges: this.options.pushChanges,
      pushTags: this.options.pushTags,
      repoRoot: this.options.repoRoot,
      dryRun: this.options.dryRun
    };
    this.gitOperations = new GitOperations(gitOperationsOptions);

    // Commit and push changes
    await this.gitOperations.commitAndPushChanges(changedModules);

    // Create and push tags
    const createdTags = await this.gitOperations.createAndPushTags(changedModules);

    core.info('✅ VERSE semantic evolution pipeline completed successfully!');

    return {
      bumped: true,
      changedModules,
      createdTags,
      changelogPaths,
    };
  }
}