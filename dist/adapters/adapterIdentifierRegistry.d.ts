import { AdapterIdentifier } from './identifier.js';
/**
 * Composed adapter identifier that chains multiple adapter identifiers.
 * Iterates through a list of identifiers until one returns a non-null result.
 */
export declare class AdapterIdentifierRegistry {
    private readonly identifiers;
    private readonly supportedAdapters;
    /**
     * Creates a registry of adapter identifiers.
     *
     * @param identifiers - Array of adapter identifiers
     */
    constructor(identifiers: AdapterIdentifier[]);
    /**
     * Identifies the project adapter by delegating to each identifier in sequence.
     * Returns the first non-null result, or null if no identifier matches.
     *
     * @param projectRoot - The root directory of the project to analyze
     * @returns The adapter name if any identifier matches, null otherwise
     */
    identify(projectRoot: string): Promise<AdapterIdentifier | null>;
    getIdentifierById(id: string): AdapterIdentifier | null;
    getSupportedAdapters(): string[];
}
//# sourceMappingURL=adapterIdentifierRegistry.d.ts.map