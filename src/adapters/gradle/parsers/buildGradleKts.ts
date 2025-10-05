import { promises as fs } from 'fs';
import { SemVer } from '../../../adapters/core.js';
import { parseSemVer } from '../../../semver/index.js';

export interface KotlinDSLDependency {
  configuration: string;
  notation: string;
  isProject: boolean;
  projectPath?: string;
}

/**
 * Parse build.gradle.kts file for version and dependencies
 */
export async function parseBuildGradleKts(buildPath: string): Promise<{
  version?: SemVer;
  dependencies: KotlinDSLDependency[];
}> {
  try {
    const content = await fs.readFile(buildPath, 'utf8');
    
    const version = parseVersionFromKotlinDSL(content);
    const dependencies = parseDependenciesFromKotlinDSL(content);
    
    return { version, dependencies };
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
      return { dependencies: [] };
    }
    throw error;
  }
}

/**
 * Parse version from Kotlin DSL build file
 */
function parseVersionFromKotlinDSL(content: string): SemVer | undefined {
  // Look for version = "x.y.z"
  const versionMatch = content.match(/version\s*=\s*["']([^"']+)["']/);
  
  if (versionMatch) {
    try {
      return parseSemVer(versionMatch[1]);
    } catch {
      // Invalid version format
    }
  }
  
  return undefined;
}

/**
 * Parse dependencies from Kotlin DSL build file
 */
function parseDependenciesFromKotlinDSL(content: string): KotlinDSLDependency[] {
  const dependencies: KotlinDSLDependency[] = [];
  
  // Find dependencies block
  const dependenciesBlockRegex = /dependencies\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
  const dependenciesMatch = dependenciesBlockRegex.exec(content);
  
  if (!dependenciesMatch) {
    return dependencies;
  }
  
  const dependenciesBlock = dependenciesMatch[1];
  
  // Parse individual dependencies
  // Pattern for: implementation("group:artifact:version")
  const stringNotationRegex = /(\w+)\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  
  while ((match = stringNotationRegex.exec(dependenciesBlock)) !== null) {
    const configuration = match[1];
    const notation = match[2];
    
    dependencies.push({
      configuration,
      notation,
      isProject: false,
    });
  }

  // Pattern for version catalog references: implementation(libs.mylib)
  const catalogNotationRegex = /(\w+)\s*\(\s*(libs\.\w+)\s*\)/g;
  
  while ((match = catalogNotationRegex.exec(dependenciesBlock)) !== null) {
    const configuration = match[1];
    const catalogRef = match[2];
    
    dependencies.push({
      configuration,
      notation: catalogRef,
      isProject: false,
    });
  }
  
  // Pattern for: implementation(project(":module"))
  const projectNotationRegex = /(\w+)\s*\(\s*project\s*\(\s*["']([^"']+)["']\s*\)\s*\)/g;
  
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
  
  return dependencies;
}

/**
 * Update version in Kotlin DSL build file
 */
export async function updateVersionInKotlinDSL(
  buildPath: string,
  newVersion: SemVer
): Promise<void> {
  const content = await fs.readFile(buildPath, 'utf8');
  const versionString = `${newVersion.major}.${newVersion.minor}.${newVersion.patch}`;
  
  // Replace version = "..." with new version
  const updatedContent = content.replace(
    /version\s*=\s*["'][^"']+["']/,
    `version = "${versionString}"`
  );
  
  // If no version found, add it after the plugins block
  if (updatedContent === content) {
    const pluginsEndMatch = content.match(/plugins\s*\{[^}]*\}/s);
    if (pluginsEndMatch) {
      const insertIndex = pluginsEndMatch.index! + pluginsEndMatch[0].length;
      const beforeInsert = content.substring(0, insertIndex);
      const afterInsert = content.substring(insertIndex);
      
      const finalContent = beforeInsert + '\n\nversion = "' + versionString + '"' + afterInsert;
      await fs.writeFile(buildPath, finalContent, 'utf8');
      return;
    }
    
    // Fallback: prepend version at the beginning
    const finalContent = `version = "${versionString}"\n\n` + content;
    await fs.writeFile(buildPath, finalContent, 'utf8');
  } else {
    await fs.writeFile(buildPath, updatedContent, 'utf8');
  }
}