import { BumpType } from '../adapters/core.js';
export interface Config {
    defaultBump: BumpType;
    commitTypes: Record<string, BumpType | 'ignore'>;
    dependencyRules: DependencyRules;
    gradle?: GradleConfig;
    nodejs?: NodeJSConfig;
}
export interface DependencyRules {
    onMajorOfDependency: BumpType;
    onMinorOfDependency: BumpType;
    onPatchOfDependency: BumpType;
    strictCompatibility: boolean;
}
export interface GradleConfig {
    versionSource: ('gradle.properties')[];
}
export interface NodeJSConfig {
    versionSource: ('package.json')[];
    updatePackageLock: boolean;
}
/**
 * Load configuration from file or return default
 */
export declare function loadConfig(configPath: string, repoRoot: string): Promise<Config>;
/**
 * Get bump type for a commit based on configuration
 */
export declare function getBumpTypeForCommit(commitType: string, isBreaking: boolean, config: Config): BumpType;
/**
 * Get bump type for a module when one of its dependencies changes
 */
export declare function getDependencyBumpType(dependencyBumpType: BumpType, config: Config): BumpType;
/**
 * Validate configuration object
 */
export declare function validateConfig(config: Config): void;
/**
 * Create a default config file
 */
export declare function createDefaultConfig(configPath: string, repoRoot: string): Promise<void>;
/**
 * Get adapter-specific configuration
 */
export declare function getAdapterConfig<T extends keyof Config>(config: Config, adapterName: T): Config[T];
//# sourceMappingURL=index.d.ts.map