import { join } from 'path';
import { formatSemVer } from '../../../semver/index.js';
import { parseVersionProperties, upsertProperty } from '../../../utils/properties.js';
import { SemVer } from 'semver';

export interface ModuleVersion {
  /** Module ID (e.g., ":", ":x", ":x:y", ":z") */
  moduleId: string;
  /** Semantic version of the module */
  version: SemVer;
}

export interface GradleProperties {
  /** Root project version */
  rootVersion?: SemVer;
  /** All module versions including root */
  moduleVersions: ModuleVersion[];
}

/**
 * Parse gradle.properties file to extract all module versions
 * 
 * Expected format:
 * - Root project: version=1.0.0
 * - Module :x: x.version=2.0.0  
 * - Module :x:y: x.y.version=3.0.0
 * - Module :z: z.version=4.0.0
 */
export async function parseGradleProperties(projectDir: string): Promise<GradleProperties> {
  const propertiesPath = join(projectDir, 'gradle.properties');
  
  try {
    const versionProperties = await parseVersionProperties(propertiesPath);
    const moduleVersions: ModuleVersion[] = [];
    let rootVersion: SemVer | undefined;
    
    // Process all version properties
    for (const [key, version] of versionProperties) {
      if (key === 'version') {
        // Root project version
        rootVersion = version;
        moduleVersions.push({
          moduleId: ':',
          version
        });
      } else {
        // Module version - convert from property name to module ID
        const moduleId = versionPropertyNameToModuleId(key);
        moduleVersions.push({
          moduleId,
          version
        });
      }
    }
    
    return {
      rootVersion,
      moduleVersions
    };
    
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
      throw new Error(`gradle.properties file not found: ${propertiesPath}. This approach requires all module versions to be defined in gradle.properties.`);
    }
    
    // Re-throw validation errors
    if (error instanceof Error && error.message.includes('Invalid version format')) {
      throw error;
    }
    
    throw new Error(`Failed to parse gradle.properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert version property name to module path
 * Examples:
 * - version -> ":" (root)
 * - x.version -> ":x"
 * - x.y.version -> ":x:y"
 */
function versionPropertyNameToModuleId(propertyName: string): string {
  if (propertyName === 'version') {
    return ':';
  }
  
  // Remove '.version' suffix
  const nameWithoutSuffix = propertyName.replace(/\.version$/, '');
  
  // Convert dot-separated to module path: "x.y" -> ":x:y"
  return ':' + nameWithoutSuffix.replaceAll('.', ':');
}

/**
 * Convert module path to version property name
 * Examples:
 * - ":" -> "version"
 * - ":x" -> "x.version"
 * - ":x:y" -> "x.y.version"
 */
function moduleIdToVersionPropertyName(moduleId: string): string {
  if (moduleId === ':') {
    return 'version';
  }
  
  // Remove leading colon and convert colons to dots: ":x:y" -> "x.y"
  const dotPath = moduleId.substring(1).replaceAll(':', '.');
  
  return dotPath + '.version';
}

/**
 * Update a module version in gradle.properties file
 */
export async function updateModuleVersionInGradleProperties(
  projectDir: string,
  moduleId: string,
  newVersion: SemVer
): Promise<void> {
  const propertiesPath = join(projectDir, 'gradle.properties');
  const propertyName = moduleIdToVersionPropertyName(moduleId);
  const versionString = formatSemVer(newVersion);

  await upsertProperty(propertiesPath, propertyName, versionString);
}
