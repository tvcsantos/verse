import { SemVer } from "semver";
/**
 * Common project hierarchy types used across different adapters
 * These types represent the generic structure of project dependencies
 * regardless of the specific build system (Gradle, Maven, etc.)
 */
/**
 * Represents a single project in the hierarchy with its dependencies
 */
export type ProjectNode = {
    /** Human-readable name of the project */
    readonly name: string;
    /** Path from repository root to the project directory */
    readonly path: string;
    /** List of subproject ids that are affected when this project changes */
    readonly affectedSubprojects: string[];
    /** Version of the project */
    readonly version: string;
    /** Project type indicating if it's the root project or a submodule */
    readonly type: 'module' | 'root';
    /** Whether the version is explicitly declared or inferred by inheritance */
    readonly declaredVersion: boolean;
};
/**
 * Complete project hierarchy dependencies structure
 * Keys are project paths (e.g., ":", ":base", ":spring:core" for Gradle)
 * Root project is represented by ":" or empty string
 */
export type ProjectHierarchy = {
    readonly [id: string]: ProjectNode;
};
/**
 * Represents a project's metadata including path, affected projects, version, and module information
 * This interface replaces the need for the Module interface
 */
export type ProjectInfo = {
    /** Project identifier (e.g., ":", ":base", ":spring:core" for Gradle) */
    readonly id: string;
    /** Human-readable name of the project */
    readonly name: string;
    /** Path from repository root to the project directory */
    readonly path: string;
    /** Project type indicating if it's the root project or a submodule */
    readonly type: 'module' | 'root';
    /** Set of projects that are affected when this project changes */
    readonly affectedProjects: Set<string>;
    /** Current version of the project */
    readonly version: SemVer;
    /** Whether the version is explicitly declared or inferred by inheritance */
    readonly declaredVersion: boolean;
};
/**
 * Result of parsing the hierarchy dependencies
 */
export type HierarchyParseResult = {
    /** All project ids found in the hierarchy */
    readonly projectIds: string[];
    /** Map of project id to its metadata (path and dependencies) for efficient lookup */
    readonly projectMap: ReadonlyMap<string, ProjectInfo>;
    /** Root project id (usually ":" for Gradle, "." for Maven, etc.) */
    readonly rootProject: string;
};
//# sourceMappingURL=hierarchy.d.ts.map