import { SemVer } from '../../../adapters/core.js';
export interface VersionCatalogEntry {
    key: string;
    version: string;
    group?: string;
    name?: string;
}
export interface VersionCatalog {
    versions: Map<string, string>;
    libraries: Map<string, VersionCatalogEntry>;
    bundles: Map<string, string[]>;
    plugins: Map<string, VersionCatalogEntry>;
}
/**
 * Parse libs.versions.toml file (Gradle version catalog)
 */
export declare function parseVersionCatalog(catalogPath: string): Promise<VersionCatalog>;
/**
 * Find version catalog file in a module
 */
export declare function findVersionCatalogFile(modulePath: string): Promise<string | null>;
/**
 * Update version in version catalog
 */
export declare function updateVersionInCatalog(catalogPath: string, versionKey: string, newVersion: SemVer): Promise<void>;
/**
 * Get version from catalog using version reference
 */
export declare function resolveVersionFromCatalog(versionRef: string, catalog: VersionCatalog): string | null;
//# sourceMappingURL=versionCatalog.d.ts.map