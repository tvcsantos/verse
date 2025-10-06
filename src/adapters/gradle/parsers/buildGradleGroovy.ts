import { promises as fs } from 'fs';
import { dirname } from 'path';
import { parseGradleProperties, GradleProperties, ModuleVersion } from './gradleProperties.js';
import { SemVer } from 'semver';

export interface GroovyDependency {
  configuration: string;
  notation: string;
  isProject: boolean;
  projectPath?: string;
}

export interface GradleGroovyResult {
  /** Root project version (same as moduleVersions where modulePath = ".") */
  version?: SemVer;
  /** All module versions from gradle.properties */
  moduleVersions: ModuleVersion[];
  /** Inter-project dependencies */
  dependencies: GroovyDependency[];
}

/**
 * Parse build.gradle (Groovy) file for versions and dependencies
 * All versions are read from gradle.properties file using standardized naming convention
 */
export async function parseBuildGradleGroovy(buildPath: string): Promise<GradleGroovyResult> {
  try {
    const content = await fs.readFile(buildPath, 'utf8');
    const projectDir = dirname(buildPath);
    
    // Read all module versions from gradle.properties
    const gradleProperties = await parseGradleProperties(projectDir);
    
    // Parse inter-project dependencies from build file
    const dependencies = parseDependenciesFromGroovy(content);
    
    return {
      version: gradleProperties.rootVersion,
      moduleVersions: gradleProperties.moduleVersions,
      dependencies
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
      throw new Error(`Gradle build file not found: ${buildPath}. Make sure this is a valid Gradle project.`);
    }
    // Re-throw gradle.properties errors
    throw error;
  }
}





/**
 * Parse dependencies from Groovy build file
 * Focuses only on inter-project dependencies for multi-module version coordination
 */
function parseDependenciesFromGroovy(content: string): GroovyDependency[] {
  const dependencies: GroovyDependency[] = [];
  
  // Find dependencies block
  const dependenciesBlockRegex = /dependencies\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
  const dependenciesMatch = dependenciesBlockRegex.exec(content);
  
  if (!dependenciesMatch) {
    return dependencies;
  }
  
  const dependenciesBlock = dependenciesMatch[1];
  
  // Only parse inter-project dependencies - these are the ones that matter for versioning coordination
  // Pattern for: implementation project(':module')
  const projectNotationRegex = /(\w+)\s+project\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  
  while ((match = projectNotationRegex.exec(dependenciesBlock)) !== null) {
    const configuration = match[1];
    const projectPath = match[2];
    
    dependencies.push({
      configuration,
      notation: projectPath,
      isProject: true,
      projectPath,
    });
  }
  
  // Pattern for method call style: implementation(project(':module'))
  const methodCallProjectRegex = /(\w+)\s*\(\s*project\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)/g;
  
  while ((match = methodCallProjectRegex.exec(dependenciesBlock)) !== null) {
    const configuration = match[1];
    const projectPath = match[2];
    
    dependencies.push({
      configuration,
      notation: projectPath,
      isProject: true,
      projectPath,
    });
  }
  
  return dependencies;
}

/**
 * Update module version in gradle.properties file
 * @param buildPath Path to build.gradle file (used to locate gradle.properties)
 * @param modulePath Module path (e.g., ".", ":x", ":x:y") 
 * @param newVersion New semantic version
 */
export async function updateModuleVersionInGroovy(
  buildPath: string,
  modulePath: string,
  newVersion: SemVer
): Promise<void> {
  const projectDir = dirname(buildPath);
  const { updateModuleVersionInGradleProperties } = await import('./gradleProperties.js');
  await updateModuleVersionInGradleProperties(projectDir, modulePath, newVersion);
}

/**
 * Update root project version (shorthand for updating "." module)
 */
export async function updateVersionInGroovy(
  buildPath: string,
  newVersion: SemVer
): Promise<void> {
  await updateModuleVersionInGroovy(buildPath, '.', newVersion);
}

/**
 * Get guidance for the gradle.properties approach
 */
export function getVersionNotFoundGuidance(): string {
  return `No module versions found in gradle.properties. This tool uses a standardized approach where all module versions are defined in gradle.properties:

gradle.properties format:
  # Root project version
  version=1.0.0
  
  # Module versions (camelCase property names)
  xVersion=2.0.0        # for module :x
  xYVersion=3.0.0       # for module :x:y  
  zVersion=4.0.0        # for module :z
  myModuleVersion=5.0.0 # for module :myModule

All versions must follow semantic versioning format (major.minor.patch, e.g., "1.2.3").`;
}