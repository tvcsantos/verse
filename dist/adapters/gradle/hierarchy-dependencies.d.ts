/**
 * Gradle-specific implementation for parsing project hierarchy dependencies
 * Uses the init-hierarchy-deps.gradle.kts script to extract dependency information
 */
import { ProjectHierarchy, HierarchyParseResult } from '../hierarchy.js';
/**
 * Execute the gradle hierarchy command to get the JSON output
 */
export declare function executeGradleHierarchyCommand(projectRoot: string): Promise<string>;
/**
 * Parse the hierarchy structure and extract dependency relationships
 */
export declare function parseHierarchyStructure(hierarchy: ProjectHierarchy): HierarchyParseResult;
//# sourceMappingURL=hierarchy-dependencies.d.ts.map