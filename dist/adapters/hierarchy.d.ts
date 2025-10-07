import { SemVer } from "semver";
/**
 * Common project hierarchy types used across different adapters
 * These types represent the generic structure of project dependencies
 * regardless of the specific build system (Gradle, Maven, etc.)
 */
/**
 * Represents a single project in the hierarchy with its dependencies
 */
export interface ProjectNode {
    /** Path from repository root to the project directory */
    path: string;
    /** List of subproject ids that are affected when this project changes */
    affectedSubprojects: string[];
    /** Version of the project */
    version: string;
    /** Project type indicating if it's the root project or a submodule */
    type: 'module' | 'root';
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
 * Represents a project's metadata including path, affected projects, version, and module information
 * This interface replaces the need for the Module interface
 */
export interface ProjectInfo {
    /** Project identifier (e.g., ":", ":base", ":spring:core" for Gradle) */
    id: string;
    /** Path from repository root to the project directory */
    path: string;
    /** Project type indicating if it's the root project or a submodule */
    type: 'module' | 'root';
    /** Set of projects that are affected when this project changes */
    affectedProjects: Set<string>;
    /** Current version of the project */
    version: SemVer;
}
/**
 * Result of parsing the hierarchy dependencies
 */
export interface HierarchyParseResult {
    /** All project ids found in the hierarchy */
    projectIds: string[];
    /** Map of project id to its metadata (path and dependencies) for efficient lookup */
    projectMap: Map<string, ProjectInfo>;
    /** Root project id (usually ":" for Gradle, "." for Maven, etc.) */
    rootProject: string;
}
//# sourceMappingURL=hierarchy.d.ts.map