/**
 * Gradle-specific implementation for parsing project hierarchy dependencies
 * Uses the init-hierarchy-deps.gradle.kts script to extract dependency information
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import {
  ProjectHierarchy,
  HierarchyParseResult,
  ProjectInfo
} from '../../hierarchy.js';
import { spawn } from 'child_process';
import { parseSemVer } from '../../../semver/index.js';

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
export function parseHierarchyStructure(hierarchy: ProjectHierarchy, repoRoot: string): HierarchyParseResult {
  const projectIds = Object.keys(hierarchy);
  const projectMap = new Map<string, ProjectInfo>();
  
  // Find root project by looking for the one with type 'root'
  let rootProject: string | undefined;
  for (const [projectId, projectNode] of Object.entries(hierarchy)) {
    if (projectNode.type === 'root') {
      rootProject = projectId;
    }
    projectMap.set(projectId, {
      id: projectId,
      path: projectNode.path,
      type: projectNode.type,
      affectedProjects: new Set(projectNode.affectedSubprojects),
      version: parseSemVer(projectNode.version)
    });
  }
  
  if (!rootProject) {
    throw new Error('No root project found in hierarchy. Every project hierarchy must contain exactly one project with type "root".');
  }
  
  return {
    projectIds,
    projectMap,
    rootProject
  };
}
