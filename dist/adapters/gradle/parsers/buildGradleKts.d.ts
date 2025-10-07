import { ModuleVersion } from './gradleProperties.js';
import { SemVer } from 'semver';
export interface KotlinDSLDependency {
    configuration: string;
    notation: string;
    isProject: boolean;
    projectPath?: string;
}
export interface GradleKotlinResult {
    /** Root project version (same as moduleVersions where modulePath = ".") */
    version?: SemVer;
    /** All module versions from gradle.properties */
    moduleVersions: ModuleVersion[];
    /** Inter-project dependencies */
    dependencies: KotlinDSLDependency[];
}
/**
 * Parse build.gradle.kts file for versions and dependencies
 * All versions are read from gradle.properties file using standardized naming convention
 */
export declare function parseBuildGradleKts(buildPath: string): Promise<GradleKotlinResult>;
/**
 * Update module version in gradle.properties file
 * @param buildPath Path to build.gradle.kts file (used to locate gradle.properties)
 * @param modulePath Module path (e.g., ".", ":x", ":x:y")
 * @param newVersion New semantic version
 */
export declare function updateModuleVersionInKotlinDSL(buildPath: string, modulePath: string, newVersion: SemVer): Promise<void>;
/**
 * Update root project version (shorthand for updating "." module)
 */
export declare function updateVersionInKotlinDSL(buildPath: string, newVersion: SemVer): Promise<void>;
/**
 * Get guidance for the gradle.properties approach
 */
export declare function getVersionNotFoundGuidance(): string;
//# sourceMappingURL=buildGradleKts.d.ts.map