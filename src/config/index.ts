import { promises as fs } from 'fs';
import { join } from 'path';
import { BumpType } from '../adapters/core.js';

export interface Config {
  defaultBump: BumpType;
  commitTypes: Record<string, BumpType | 'ignore'>;
  dependencyRules: DependencyRules;
  gradle?: GradleConfig;
  nodejs?: NodeJSConfig;
  python?: PythonConfig;
}

export interface DependencyRules {
  onMajorOfDependency: BumpType;
  onMinorOfDependency: BumpType;
  onPatchOfDependency: BumpType;
  strictCompatibility: boolean;
}

export interface GradleConfig {
  versionSource: ('gradle.properties' | 'build.gradle' | 'build.gradle.kts' | 'version-catalog')[];
  updateVersionCatalog: boolean;
  versionCatalogPath?: string;
}

export interface NodeJSConfig {
  versionSource: ('package.json')[];
  updatePackageLock: boolean;
}

export interface PythonConfig {
  versionSource: ('pyproject.toml' | 'setup.py' | '__init__.py')[];
  updateRequirements: boolean;
}

const DEFAULT_CONFIG: Config = {
  defaultBump: 'patch',
  commitTypes: {
    feat: 'minor',
    fix: 'patch',
    perf: 'patch',
    refactor: 'patch',
    docs: 'ignore',
    test: 'ignore',
    chore: 'ignore',
    style: 'ignore',
    ci: 'ignore',
    build: 'ignore',
  },
  dependencyRules: {
    onMajorOfDependency: 'minor',
    onMinorOfDependency: 'patch',
    onPatchOfDependency: 'none',
    strictCompatibility: false,
  },
  gradle: {
    versionSource: ['version-catalog', 'gradle.properties', 'build.gradle.kts'],
    updateVersionCatalog: true,
  },
};

/**
 * Load configuration from file or return default
 */
export async function loadConfig(configPath: string, repoRoot: string): Promise<Config> {
  const fullPath = join(repoRoot, configPath);
  
  try {
    const configContent = await fs.readFile(fullPath, 'utf8');
    const userConfig = JSON.parse(configContent);
    
    return mergeConfig(DEFAULT_CONFIG, userConfig);
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
      console.log(`No config file found at ${configPath}, using defaults`);
      return DEFAULT_CONFIG;
    }
    
    throw new Error(`Failed to load config from ${configPath}: ${error}`);
  }
}

/**
 * Merge user config with default config
 */
function mergeConfig(defaultConfig: Config, userConfig: Partial<Config>): Config {
  return {
    defaultBump: userConfig.defaultBump || defaultConfig.defaultBump,
    commitTypes: {
      ...defaultConfig.commitTypes,
      ...userConfig.commitTypes,
    },
    dependencyRules: {
      ...defaultConfig.dependencyRules,
      ...userConfig.dependencyRules,
    },
    gradle: userConfig.gradle ? {
      ...defaultConfig.gradle,
      ...userConfig.gradle,
    } : defaultConfig.gradle,
    nodejs: userConfig.nodejs,
    python: userConfig.python,
  };
}

/**
 * Get bump type for a commit based on configuration
 */
export function getBumpTypeForCommit(
  commitType: string,
  isBreaking: boolean,
  config: Config
): BumpType {
  if (isBreaking) {
    return 'major';
  }
  
  const configuredBump = config.commitTypes[commitType];
  
  if (configuredBump === 'ignore') {
    return 'none';
  }
  
  return configuredBump || config.defaultBump;
}

/**
 * Get bump type for a module when one of its dependencies changes
 */
export function getDependencyBumpType(
  dependencyBumpType: BumpType,
  config: Config
): BumpType {
  const rules = config.dependencyRules;
  
  switch (dependencyBumpType) {
    case 'major':
      return rules.onMajorOfDependency;
    case 'minor':
      return rules.onMinorOfDependency;
    case 'patch':
      return rules.onPatchOfDependency;
    default:
      return 'none';
  }
}

/**
 * Validate configuration object
 */
export function validateConfig(config: Config): void {
  const validBumpTypes: (BumpType | 'ignore')[] = ['major', 'minor', 'patch', 'none', 'ignore'];
  
  if (!validBumpTypes.includes(config.defaultBump)) {
    throw new Error(`Invalid defaultBump: ${config.defaultBump}`);
  }
  
  for (const [commitType, bumpType] of Object.entries(config.commitTypes)) {
    if (!validBumpTypes.includes(bumpType)) {
      throw new Error(`Invalid bump type for commit type '${commitType}': ${bumpType}`);
    }
  }
  
  const depRules = config.dependencyRules;
  const validDepBumpTypes: BumpType[] = ['major', 'minor', 'patch', 'none'];
  
  if (!validDepBumpTypes.includes(depRules.onMajorOfDependency)) {
    throw new Error(`Invalid onMajorOfDependency: ${depRules.onMajorOfDependency}`);
  }
  
  if (!validDepBumpTypes.includes(depRules.onMinorOfDependency)) {
    throw new Error(`Invalid onMinorOfDependency: ${depRules.onMinorOfDependency}`);
  }
  
  if (!validDepBumpTypes.includes(depRules.onPatchOfDependency)) {
    throw new Error(`Invalid onPatchOfDependency: ${depRules.onPatchOfDependency}`);
  }
  
  if (typeof depRules.strictCompatibility !== 'boolean') {
    throw new Error(`strictCompatibility must be a boolean`);
  }
}

/**
 * Create a default config file
 */
export async function createDefaultConfig(configPath: string, repoRoot: string): Promise<void> {
  const fullPath = join(repoRoot, configPath);
  
  const configContent = JSON.stringify(DEFAULT_CONFIG, null, 2);
  
  try {
    await fs.writeFile(fullPath, configContent, 'utf8');
    console.log(`Created default config file at ${configPath}`);
  } catch (error) {
    throw new Error(`Failed to create config file at ${configPath}: ${error}`);
  }
}

/**
 * Get adapter-specific configuration
 */
export function getAdapterConfig<T extends keyof Config>(
  config: Config,
  adapterName: T
): Config[T] {
  return config[adapterName];
}