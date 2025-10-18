/**
 * Strategy interface for build-system specific operations.
 * Implementations provide build-system specific logic for version updates.
 */
export interface VersionUpdateStrategy {
    /**
     * Write version updates for modules to the build system's version files.
     * @param moduleVersions Map of module IDs to their new version strings
     */
    writeVersionUpdates(moduleVersions: Map<string, string>): Promise<void>;
}
//# sourceMappingURL=version-update-strategy.d.ts.map