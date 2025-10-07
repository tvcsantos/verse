export interface GradleModule {
    name: string;
    path: string;
}
/**
 * Parse settings.gradle or settings.gradle.kts file
 */
export declare function parseSettingsGradle(settingsPath: string): Promise<GradleModule[]>;
/**
 * Find settings.gradle or settings.gradle.kts file
 */
export declare function findSettingsFile(repoRoot: string): Promise<string | null>;
/**
 * Get all Gradle modules from settings file
 */
export declare function getAllGradleModules(repoRoot: string): Promise<GradleModule[]>;
//# sourceMappingURL=settings.d.ts.map