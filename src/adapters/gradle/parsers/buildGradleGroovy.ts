import { promises as fs } from 'fs';
import { SemVer } from '../../../adapters/core.js';
import { parseSemVer } from '../../../semver/index.js';

export interface GroovyDependency {
  configuration: string;
  notation: string;
  isProject: boolean;
  projectPath?: string;
}

/**
 * Parse build.gradle (Groovy) file for version and dependencies
 */
export async function parseBuildGradleGroovy(buildPath: string): Promise<{
  version?: SemVer;
  dependencies: GroovyDependency[];
}> {
  try {
    const content = await fs.readFile(buildPath, 'utf8');
    
    const version = parseVersionFromGroovy(content);
    const dependencies = parseDependenciesFromGroovy(content);
    
    return { version, dependencies };
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
      return { dependencies: [] };
    }
    throw error;
  }
}

/**
 * Parse version from Groovy build file
 */
function parseVersionFromGroovy(content: string): SemVer | undefined {
  // Look for version = 'x.y.z' or version 'x.y.z'
  const versionMatch = content.match(/version\s*[=]?\s*['"]([^'"]+)['"]/);
  
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
 * Parse dependencies from Groovy build file
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
  
  // Parse string notation dependencies
  // Pattern for: implementation 'group:artifact:version'
  const stringNotationRegex = /(\w+)\s+['"]([^'"]+)['"]/g;
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
  
  // Pattern for: implementation project(':module')
  const projectNotationRegex = /(\w+)\s+project\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  
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
  
  // Pattern for method call style: implementation('group:artifact:version')
  const methodCallRegex = /(\w+)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  
  while ((match = methodCallRegex.exec(dependenciesBlock)) !== null) {
    const configuration = match[1];
    const notation = match[2];
    
    // Skip if it's a project dependency (already handled above)
    if (!notation.startsWith(':')) {
      dependencies.push({
        configuration,
        notation,
        isProject: false,
      });
    }
  }

  // Pattern for version catalog references: implementation libs.mylib
  const catalogNotationRegex = /(\w+)\s+(libs\.\w+)/g;
  
  while ((match = catalogNotationRegex.exec(dependenciesBlock)) !== null) {
    const configuration = match[1];
    const catalogRef = match[2];
    
    dependencies.push({
      configuration,
      notation: catalogRef,
      isProject: false,
    });
  }
  
  return dependencies;
}

/**
 * Update version in Groovy build file
 */
export async function updateVersionInGroovy(
  buildPath: string,
  newVersion: SemVer
): Promise<void> {
  const content = await fs.readFile(buildPath, 'utf8');
  const versionString = `${newVersion.major}.${newVersion.minor}.${newVersion.patch}`;
  
  // Replace version = "..." or version "..." with new version
  let updatedContent = content.replace(
    /version\s*=\s*['"][^'"]+['"]/,
    `version = '${versionString}'`
  );
  
  // If that didn't match, try without equals sign
  if (updatedContent === content) {
    updatedContent = content.replace(
      /version\s+['"][^'"]+['"]/,
      `version '${versionString}'`
    );
  }
  
  // If no version found, add it after the plugins block or at the beginning
  if (updatedContent === content) {
    const pluginsEndMatch = content.match(/plugins\s*\{[^}]*\}/s);
    if (pluginsEndMatch) {
      const insertIndex = pluginsEndMatch.index! + pluginsEndMatch[0].length;
      const beforeInsert = content.substring(0, insertIndex);
      const afterInsert = content.substring(insertIndex);
      
      const finalContent = beforeInsert + '\n\nversion \'' + versionString + '\'' + afterInsert;
      await fs.writeFile(buildPath, finalContent, 'utf8');
      return;
    }
    
    // Fallback: prepend version at the beginning
    const finalContent = `version '${versionString}'\n\n` + content;
    await fs.writeFile(buildPath, finalContent, 'utf8');
  } else {
    await fs.writeFile(buildPath, updatedContent, 'utf8');
  }
}