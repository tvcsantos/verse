/**
 * Common project hierarchy types used across different adapters
 * These types represent the generic structure of project dependencies
 * regardless of the specific build system (Gradle, Maven, etc.)
 */

/**
 * Represents a single project in the hierarchy with its dependencies
 */
export interface ProjectNode {
  /** Absolute file system path to the project directory */
  path: string;
  /** List of subproject ids that are affected when this project changes */
  affectedSubprojects: string[];
}

/**
 * Complete project hierarchy dependencies structure
 * Keys are project paths (e.g., ":", ":base", ":spring:core" for Gradle)
 * Root project is represented by ":" or empty string
 */
export interface ProjectHierarchy {
  [id: string]: ProjectNode;
}

/**
 * Represents the dependency relationship between projects
 */
export interface HierarchyDependency {
  /** The project that depends on others */
  dependent: string;
  /** The project being depended upon */
  dependency: string;
}

/**
 * Result of parsing the hierarchy dependencies
 */
export interface HierarchyParseResult {
  /** The raw hierarchy data */
  hierarchy: ProjectHierarchy;
  /** All project ids found in the hierarchy */
  projectIds: string[];
  /** Map of project id to all its dependencies (direct + transitive) for efficient lookup */
  dependencyMap: Map<string, Set<string>>;
  /** Root project id (usually ":" for Gradle, "." for Maven, etc.) */
  rootProject: string;
}