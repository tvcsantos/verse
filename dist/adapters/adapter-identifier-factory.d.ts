import { AdapterMetadata } from './identifier.js';
import { AdapterIdentifierRegistry } from './adapter-identifier-registry.js';
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
//# sourceMappingURL=adapter-identifier-factory.d.ts.map