import { AdapterIdentifier } from '../identifier.js';
/**
 * Adapter identifier for Gradle projects.
 * Identifies Gradle projects by looking for build.gradle(.kts) and settings.gradle(.kts) files.
 */
export declare class GradleAdapterIdentifier implements AdapterIdentifier {
    identify(projectRoot: string): Promise<string | null>;
}
//# sourceMappingURL=gradleAdapterIdentifier.d.ts.map