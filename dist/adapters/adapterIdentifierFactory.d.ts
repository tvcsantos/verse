import { AdapterIdentifier } from './identifier.js';
import { ComposedAdapterIdentifier } from './composedAdapterIdentifier.js';
import { RunnerOptions } from '../runner.js';
/**
 * Factory for creating adapter identifiers.
 * Provides pre-configured identifiers with all supported adapters.
 */
export declare class AdapterIdentifierFactory {
    /**
     * Creates a composed adapter identifier with all available adapters.
     *
     * @returns ComposedAdapterIdentifier configured with all supported adapters
     */
    static createComposedIdentifier(): ComposedAdapterIdentifier;
    /**
     * Gets all available adapter identifiers.
     *
     * @returns Array of all available adapter identifiers
     */
    static getAllIdentifiers(): AdapterIdentifier[];
    /**
     * Creates a specific adapter identifier by name.
     *
     * @param adapterName - The name of the adapter to create an identifier for
     * @returns The specific adapter identifier, or null if not found
     */
    static createSpecificIdentifier(adapterName: string): AdapterIdentifier | null;
    /**
     * Gets all supported adapter names.
     *
     * @returns Array of supported adapter names
     */
    static getSupportedAdapters(): string[];
}
export declare function getAdapter(options: RunnerOptions): Promise<string>;
//# sourceMappingURL=adapterIdentifierFactory.d.ts.map