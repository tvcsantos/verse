/**
 * Gradle-specific implementation for parsing project hierarchy dependencies
 * Uses the init-hierarchy-deps.gradle.kts script to extract dependency information
 */

import { join } from 'path';
import {
  ProjectHierarchy,
  HierarchyParseResult,
  ProjectInfo
} from '../../hierarchy.js';
import { getExecOutput } from '@actions/exec';
import { parseSemVer } from '../../../semver/index.js';
import { fileExists } from '../../../utils/file.js';
import { getGitHubActionPath } from '../../../io/action.js';

/**
 * Execute the gradle hierarchy command to get the JSON output
 */
export async function executeGradleHierarchyCommand(projectRoot: string): Promise<string> {
  const gradlew = join(projectRoot, 'gradlew');
  const initScriptPath = getGitHubActionPath('init-hierarchy-deps.gradle.kts');
  
  // Check if init script exists
  const scriptExists = await fileExists(initScriptPath);
  if (!scriptExists) {
    throw new Error(`Init script not found at ${initScriptPath}. Please create the init-hierarchy-deps.gradle.kts file.`);
  }
  
  const args = [
    '--quiet',
    '--console=plain',
    '--init-script',
    initScriptPath,
    'hierarchy'
  ];
  
  const result = await getExecOutput(gradlew, args, {
    cwd: projectRoot,
    silent: true,
    ignoreReturnCode: true
  });

  if (result.exitCode !== 0) {
    throw new Error(`Gradle command failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  return result.stdout.trim();
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
      name: projectNode.name,
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
