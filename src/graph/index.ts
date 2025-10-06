import { ModuleChange, BumpType } from '../adapters/core.js';
import { ProjectInfo } from '../adapters/hierarchy.js';
import { HierarchyModuleManager } from '../adapters/hierarchy/hierarchyModuleManager.js';
import { maxBumpType, parseSemVer } from '../semver/index.js';

export interface CascadeResult {
  changes: ModuleChange[];
  processed: Set<string>;
}

/**
 * Calculate cascade effects when modules change
 */
export function calculateCascadeEffects(
  moduleManager: HierarchyModuleManager,
  initialChanges: ModuleChange[],
  getDependencyBumpType: (dependencyBump: BumpType) => BumpType
): CascadeResult {
  const changes = [...initialChanges];
  const processed = new Set<string>();
  const changeMap = new Map<string, ModuleChange>();

  // Index initial changes
  for (const change of initialChanges) {
    changeMap.set(change.module.id, change);
    processed.add(change.module.id);
  }

  const queue = [...initialChanges];

  while (queue.length > 0) {
    const currentChange = queue.shift()!;
    const currentModuleInfo = moduleManager.getModuleInfo(currentChange.module.id);

    for (const dependentName of currentModuleInfo.affectedProjects) {
      if (processed.has(dependentName)) {
        continue; // Already processed this module
      }

      let projectInfo: ProjectInfo;
      try {
        projectInfo = moduleManager.getModuleInfo(dependentName);
      } catch {
        continue; // Module not found
      }

      // Calculate the bump needed for the dependent
      const requiredBump = getDependencyBumpType(currentChange.bumpType);
      
      if (requiredBump === 'none') {
        continue; // No cascade needed
      }

      // Check if we already have a change for this module
      const existingChange = changeMap.get(dependentName);
      if (existingChange) {
        // Merge with existing change if this bump is higher
        const mergedBump = maxBumpType([existingChange.bumpType, requiredBump]);
        if (mergedBump !== existingChange.bumpType) {
          existingChange.bumpType = mergedBump;
          queue.push(existingChange); // Re-process with new bump type
        }
      } else {
        // Create new cascade change
        const cascadeChange: ModuleChange = {
          module: projectInfo,
          fromVersion: parseSemVer('0.0.0'), // Will be filled in by caller
          toVersion: parseSemVer('0.0.0'), // Will be filled in by caller
          bumpType: requiredBump,
          reason: 'cascade',
        };

        changes.push(cascadeChange);
        changeMap.set(dependentName, cascadeChange);
        queue.push(cascadeChange);
      }

      processed.add(dependentName);
    }
  }

  return {
    changes,
    processed,
  };
}
