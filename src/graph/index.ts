import { ProcessingModuleChange, BumpType } from '../adapters/core.js';
import { ProjectInfo } from '../adapters/hierarchy.js';
import { HierarchyModuleManager } from '../adapters/hierarchy/hierarchyModuleManager.js';
import { maxBumpType, createInitialVersion } from '../semver/index.js';

/**
 * Calculate cascade effects when modules change.
 * Modifies the input array in place and returns all modules with cascade effects applied.
 */
export function calculateCascadeEffects(
  moduleManager: HierarchyModuleManager,
  allModuleChanges: ProcessingModuleChange[],
  getDependencyBumpType: (dependencyBump: BumpType) => BumpType
): ProcessingModuleChange[] {
  const processed = new Set<string>();
  const moduleMap = new Map<string, ProcessingModuleChange>();
  
  // Create module map for O(1) lookups
  for (const change of allModuleChanges) {
    moduleMap.set(change.module.id, change);
  }
  
  // Start with ALL modules - treat them completely equally
  const queue = [...allModuleChanges];

  while (queue.length > 0) {
    const currentChange = queue.shift()!;
    
    // Skip if already processed or no processing needed or no actual bump
    if (processed.has(currentChange.module.id) || !currentChange.needsProcessing || currentChange.bumpType === 'none') {
      continue;
    }
    
    processed.add(currentChange.module.id);
    const currentModuleInfo = moduleManager.getModuleInfo(currentChange.module.id);

    for (const dependentName of currentModuleInfo.affectedProjects) {
      if (processed.has(dependentName)) {
        continue; // Already processed this module
      }

      // Get the dependent module using O(1) lookup
      const existingChange = moduleMap.get(dependentName);
      if (!existingChange) {
        continue; // Module not found in our module list
      }

      // Calculate the bump needed for the dependent
      const requiredBump = getDependencyBumpType(currentChange.bumpType);
      
      if (requiredBump === 'none') {
        continue; // No cascade needed
      }

      // Update the existing change with cascade information
      const mergedBump = maxBumpType([existingChange.bumpType, requiredBump]);
      if (mergedBump !== existingChange.bumpType || !existingChange.needsProcessing) {
        // Update the module change in place
        existingChange.bumpType = mergedBump;
        existingChange.reason = 'cascade';
        existingChange.needsProcessing = true;
        
        // Add to queue for further processing
        queue.push(existingChange);
      }
    }
  }

  // Return the modified array (same reference, but with cascade effects applied)
  return allModuleChanges;
}
