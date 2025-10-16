import { ProcessingModuleChange, BumpType } from '../adapters/core.js';
import { HierarchyModuleManager } from '../adapters/hierarchy/hierarchyModuleManager.js';
import { maxBumpType } from '../semver/index.js';
import * as core from '@actions/core';

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
      core.info(`🔄 Skipping module ${currentChange.module.id} - already processed or no processing needed`);
      continue;
    }
    
    processed.add(currentChange.module.id);
    const currentModuleInfo = moduleManager.getModuleInfo(currentChange.module.id);

    for (const dependentName of currentModuleInfo.affectedProjects) {
      if (processed.has(dependentName)) {
        core.info(`🔄 Skipping dependent module ${dependentName} - already processed`);
        continue; // Already processed this module
      }

      // Get the dependent module using O(1) lookup
      const existingChange = moduleMap.get(dependentName);
      if (!existingChange) {
        core.info(`⚠️ Dependent module ${dependentName} not found in module changes list`);
        continue; // Module not found in our module list
      }

      // Calculate the bump needed for the dependent
      const requiredBump = getDependencyBumpType(currentChange.bumpType);
      
      if (requiredBump === 'none') {
        core.info(`➡️ No cascade bump needed for module ${dependentName} from ${currentChange.module.id}`);
        continue; // No cascade needed
      }

      // Update the existing change with cascade information
      const mergedBump = maxBumpType([existingChange.bumpType, requiredBump]);
      if (mergedBump !== existingChange.bumpType || !existingChange.needsProcessing) {
        core.info(`🔄 Cascading bump for module ${dependentName} from ${existingChange.bumpType} to ${mergedBump} due to ${currentChange.module.id}`);
        // Update the module change in place
        existingChange.bumpType = mergedBump;
        existingChange.reason = 'cascade';
        existingChange.needsProcessing = true;
        
        // Add to queue for further processing
        queue.push(existingChange);
      } else {
        core.info(`🔄 No changes needed for module ${dependentName} - already at ${existingChange.bumpType}`);
      }
    }
  }

  // Return the modified array (same reference, but with cascade effects applied)
  return allModuleChanges;
}
