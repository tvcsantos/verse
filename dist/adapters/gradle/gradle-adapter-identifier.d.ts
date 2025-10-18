import { AdapterIdentifier } from '../identifier.js';
/**
 * Adapter identifier for Gradle projects.
 * Identifies Gradle projects by looking for build.gradle(.kts) and settings.gradle(.kts) files.
 */
export declare class GradleAdapterIdentifier implements AdapterIdentifier {
    readonly metadata: {
        id: string;
        capabilities: {
            supportsSnapshots: boolean;
        };
    };
    accept(projectRoot: string): Promise<boolean>;
}
//# sourceMappingURL=gradle-adapter-identifier.d.ts.map