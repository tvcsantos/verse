import { AdapterIdentifier } from './identifier.js';
import { ComposedAdapterIdentifier } from './composedAdapterIdentifier.js';
import { GradleAdapterIdentifier } from './gradle/gradleAdapterIdentifier.js';
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
     * @returns ComposedAdapterIdentifier configured with all supported adapters
     */
    static createComposedIdentifier(): ComposedAdapterIdentifier {
        const identifiers: AdapterIdentifier[] = [
            new GradleAdapterIdentifier(),
            // Add future adapter identifiers here:
            // new MavenAdapterIdentifier(),
            // new NodeJSAdapterIdentifier(),
            // new PythonAdapterIdentifier(),
        ];

        return new ComposedAdapterIdentifier(identifiers);
    }

    /**
     * Gets all supported adapter names.
     * 
     * @returns Array of supported adapter names
     */
    static getSupportedAdapters(): string[] {
        return [
            'gradle',
            // Add future supported adapters here:
            // 'maven',
            // 'nodejs',
            // 'python',
        ];
    }
}

export async function getAdapter(options: RunnerOptions): Promise<string> {
    let adapter: string;

    if (options.adapter) {
        // Validate the provided adapter is supported
        const supportedAdapters = AdapterIdentifierFactory.getSupportedAdapters();
        if (!supportedAdapters.includes(options.adapter.toLowerCase())) {
            throw new Error(
                `Unsupported adapter '${options.adapter}'. Supported adapters: ${supportedAdapters.join(', ')}`
            );
        }
        adapter = options.adapter.toLowerCase();
        core.info(`📝 Using explicitly provided adapter: ${adapter}`);
    } else {
        // Auto-detect adapter
        const identifier = AdapterIdentifierFactory.createComposedIdentifier();
        const detectedAdapter = await identifier.identify(options.repoRoot);

        if (detectedAdapter) {
            adapter = detectedAdapter;
            core.info(`🔍 Auto-detected adapter: ${adapter}`);
        } else {
            throw new Error(
                'No project adapter could be auto-detected. Please specify the "adapter" input explicitly in your workflow. ' +
                'Supported adapters: gradle. For more information, see the documentation.'
            );
        }
    }

    return adapter;
}