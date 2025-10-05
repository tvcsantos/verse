/**
 * Gradle-specific implementation for parsing project hierarchy dependencies
 * Uses the init-hierarchy-deps.gradle.kts script to extract dependency information
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import {
  ProjectHierarchy,
  HierarchyDependency,
  HierarchyParseResult
} from '../../hierarchy.js';
import { spawn } from 'child_process';

/**
 * Execute the Gradle hierarchy command and parse the JSON output
 */
export async function parseHierarchyDependencies(projectRoot: string): Promise<HierarchyParseResult> {
  const hierarchyJson = await executeGradleHierarchyCommand(projectRoot);
  const hierarchy: ProjectHierarchy = JSON.parse(hierarchyJson);
  
  return parseHierarchyStructure(hierarchy);
}

/**
 * Execute the gradle hierarchy command to get the JSON output
 */
export async function executeGradleHierarchyCommand(projectRoot: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const gradlew = join(projectRoot, 'gradlew');
    const initScriptPath = join(projectRoot, 'init-hierarchy-deps.gradle.kts');
    
    // Check if init script exists
    fs.access(initScriptPath).catch(() => {
      reject(new Error(`Init script not found at ${initScriptPath}. Please create the init-hierarchy-deps.gradle.kts file.`));
      return;
    });
    
    const args = [
      '--quiet',
      '--console=plain',
      '--init-script',
      'init-hierarchy-deps.gradle.kts',
      'hierarchy'
    ];
    
    const process = spawn(gradlew, args, {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Gradle hierarchy command failed with code ${code}: ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });
    
    process.on('error', (error) => {
      reject(new Error(`Failed to execute gradle hierarchy command: ${error.message}`));
    });
  });
}

/**
 * Parse the hierarchy structure and extract dependency relationships
 */
export function parseHierarchyStructure(hierarchy: ProjectHierarchy): HierarchyParseResult {
  const projectPaths = Object.keys(hierarchy);
  const dependencies: HierarchyDependency[] = [];
  let rootProject = ':';
  
  // Find root project (either ":" or empty string)
  if (hierarchy[':']) {
    rootProject = ':';
  } else if (hierarchy['']) {
    rootProject = '';
  }
  
  // Build dependency relationships
  for (const [projectPath, projectNode] of Object.entries(hierarchy)) {
    for (const affectedProject of projectNode.affectedSubprojects) {
      dependencies.push({
        dependent: affectedProject,
        dependency: projectPath
      });
    }
  }
  
  return {
    hierarchy,
    projectPaths,
    dependencies,
    rootProject
  };
}

/**
 * Get all projects that depend on the given project
 */
export function getDependentsOf(parseResult: HierarchyParseResult, projectPath: string): string[] {
  return parseResult.dependencies
    .filter(dep => dep.dependency === projectPath)
    .map(dep => dep.dependent);
}

/**
 * Get all projects that the given project depends on
 */
export function getDependenciesOf(parseResult: HierarchyParseResult, projectPath: string): string[] {
  return parseResult.dependencies
    .filter(dep => dep.dependent === projectPath)
    .map(dep => dep.dependency);
}

/**
 * Convert project path to file system path
 */
export function getProjectPath(parseResult: HierarchyParseResult, projectPath: string): string | undefined {
  return parseResult.hierarchy[projectPath]?.path;
}