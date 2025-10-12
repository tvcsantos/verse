import { AdapterIdentifier } from './identifier.js';
/**
 * Composed adapter identifier that chains multiple adapter identifiers.
 * Iterates through a list of identifiers until one returns a non-null result.
 */
export declare class ComposedAdapterIdentifier implements AdapterIdentifier {
    private identifiers;
    /**
     * Creates a composed adapter identifier.
     *
     * @param identifiers - Array of adapter identifiers to chain
     */
    constructor(identifiers: AdapterIdentifier[]);
    /**
     * Identifies the project adapter by delegating to each identifier in sequence.
     * Returns the first non-null result, or null if no identifier matches.
     *
     * @param projectRoot - The root directory of the project to analyze
     * @returns The adapter name if any identifier matches, null otherwise
     */
    identify(projectRoot: string): Promise<string | null>;
    /**
     * Adds a new identifier to the chain.
     *
     * @param identifier - The adapter identifier to add
     */
    addIdentifier(identifier: AdapterIdentifier): void;
    /**
     * Gets all registered identifiers.
     *
     * @returns Array of registered adapter identifiers
     */
    getIdentifiers(): AdapterIdentifier[];
}
//# sourceMappingURL=composedAdapterIdentifier.d.ts.map