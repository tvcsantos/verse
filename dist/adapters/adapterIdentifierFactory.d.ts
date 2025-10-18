import { AdapterMetadata } from './identifier.js';
import { AdapterIdentifierRegistry } from './adapterIdentifierRegistry.js';
import { RunnerOptions } from '../runner.js';
/**
 * Factory for creating adapter identifiers.
 * Provides pre-configured identifiers with all supported adapters.
 */
export declare class AdapterIdentifierFactory {
    /**
     * Creates a composed adapter identifier with all available adapters.
     *
     * @returns AdapterIdentifierRegistry configured with all supported adapters
     */
    static createAdapterIdentifierRegistry(): AdapterIdentifierRegistry;
}
export declare function getAdapterMetadata(options: RunnerOptions): Promise<AdapterMetadata>;
//# sourceMappingURL=adapterIdentifierFactory.d.ts.map