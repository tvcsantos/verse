import { VersionUpdateStrategy } from '../core.js';
/**
 * Gradle-specific implementation for version update operations.
 * Handles gradle.properties file updates and module ID to property name conversion.
 */
export declare class GradleVersionUpdateStrategy implements VersionUpdateStrategy {
    private readonly versionFilePath;
    constructor(repoRoot: string);
    /**
     * Write version updates for modules to gradle.properties file.
     * Converts module IDs to property names and performs batch update.
     */
    writeVersionUpdates(moduleVersions: Map<string, string>): Promise<void>;
}
//# sourceMappingURL=gradle-version-update-strategy.d.ts.map