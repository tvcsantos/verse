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
     * Gets all supported adapter names.
     *
     * @returns Array of supported adapter names
     */
    static getSupportedAdapters(): string[];
}
export declare function getAdapter(options: RunnerOptions): Promise<string>;
//# sourceMappingURL=adapterIdentifierFactory.d.ts.map