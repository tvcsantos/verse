import { promises as fs } from 'fs';
import { join } from 'path';

export interface GradleModule {
  name: string;
  path: string;
}

/**
 * Parse settings.gradle or settings.gradle.kts file
 */
export async function parseSettingsGradle(settingsPath: string): Promise<GradleModule[]> {
  try {
    const content = await fs.readFile(settingsPath, 'utf8');
    const modules: GradleModule[] = [];
    
    // Parse include statements
    const includeRegex = /include\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    let match;
    
    while ((match = includeRegex.exec(content)) !== null) {
      const moduleName = match[1];
      modules.push({
        name: moduleName.replace(/^:/, ''), // Remove leading colon
        path: moduleName.replace(/:/g, '/'), // Convert :module:submodule to module/submodule
      });
    }
    
    // Parse includeBuild statements for composite builds
    const includeBuildRegex = /includeBuild\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    
    while ((match = includeBuildRegex.exec(content)) !== null) {
      const buildPath = match[1];
      modules.push({
        name: buildPath.split('/').pop() || buildPath,
        path: buildPath,
      });
    }
    
    return modules;
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Find settings.gradle or settings.gradle.kts file
 */
export async function findSettingsFile(repoRoot: string): Promise<string | null> {
  const candidates = ['settings.gradle.kts', 'settings.gradle'];
  
  for (const candidate of candidates) {
    const settingsPath = join(repoRoot, candidate);
    try {
      await fs.access(settingsPath);
      return settingsPath;
    } catch {
      // File doesn't exist, try next
    }
  }
  
  return null;
}

/**
 * Get all Gradle modules from settings file
 */
export async function getAllGradleModules(repoRoot: string): Promise<GradleModule[]> {
  const settingsPath = await findSettingsFile(repoRoot);
  
  if (!settingsPath) {
    // Single-module project (root only)
    return [{
      name: 'root',
      path: '.',
    }];
  }
  
  const modules = await parseSettingsGradle(settingsPath);
  
  // Always include root module
  if (!modules.some(m => m.name === 'root')) {
    modules.unshift({
      name: 'root',
      path: '.',
    });
  }
  
  return modules;
}