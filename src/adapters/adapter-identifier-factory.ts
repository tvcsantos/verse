import { AdapterIdentifier, AdapterMetadata } from './identifier.js';
import { AdapterIdentifierRegistry } from './adapter-identifier-registry.js';
import { GradleAdapterIdentifier } from './gradle/gradle-adapter-identifier.js';
import { RunnerOptions } from '../runner.js';
import * as core from '@actions/core'

/**
 * Factory for creating adapter identifiers.
 * Provides pre-configured identifiers with all supported adapters.
 */
export class AdapterIdentifierFactory {
    /**
     * Creates a composed adapter identifier with all available adapters.
     * 
     * @returns AdapterIdentifierRegistry configured with all supported adapters
     */
    static createAdapterIdentifierRegistry(): AdapterIdentifierRegistry {
        const identifiers: AdapterIdentifier[] = [
            new GradleAdapterIdentifier(),
            // Add future adapter identifiers here:
            // new MavenAdapterIdentifier(),
            // new NodeJSAdapterIdentifier(),
            // new PythonAdapterIdentifier(),
        ];

        return new AdapterIdentifierRegistry(identifiers);
    }
}

const adapterIdentifierRegistry = AdapterIdentifierFactory.createAdapterIdentifierRegistry();

async function getSpecifiedAdapter(adapterId: string): Promise<AdapterIdentifier> {
    const identifier = adapterIdentifierRegistry.getIdentifierById(adapterId);
    
    if (!identifier) {
        throw new Error(
            `Unsupported adapter '${adapterId}'. Supported adapters: ${
                adapterIdentifierRegistry.getSupportedAdapters().join(', ')
            }`
        );
    }

    return identifier;
}

async function getAutoDetectedAdapter(projectRoot: string): Promise<AdapterIdentifier> {
    const identifier = await adapterIdentifierRegistry.identify(projectRoot);

    if (!identifier) {
        throw new Error(
            'No project adapter could be auto-detected. Please specify the "adapter" input explicitly in your workflow. ' +
            'Supported adapters: gradle. For more information, see the documentation.'
        );
    }

    return identifier;
}

export async function getAdapterMetadata(options: RunnerOptions): Promise<AdapterMetadata> {
    const adapterId = options.adapter?.toLowerCase();
    
    if (adapterId) {
        const identifier = await getSpecifiedAdapter(adapterId);
        core.info(`📝 Using explicitly provided adapter: ${adapterId}`);
        return identifier.metadata;
    }

    const identifier = await getAutoDetectedAdapter(options.repoRoot);
    core.info(`🔍 Auto-detected adapter: ${identifier}`);

    return identifier.metadata;
}
