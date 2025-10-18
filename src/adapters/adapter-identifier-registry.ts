import { AdapterIdentifier } from './identifier.js';

/**
 * Composed adapter identifier that chains multiple adapter identifiers.
 * Iterates through a list of identifiers until one returns a non-null result.
 */
export class AdapterIdentifierRegistry {
  private readonly identifiers: Map<string, AdapterIdentifier>;
  private readonly supportedAdapters: string[];

  /**
   * Creates a registry of adapter identifiers.
   * 
   * @param identifiers - Array of adapter identifiers
   */
  constructor(identifiers: AdapterIdentifier[]) {
    this.identifiers = new Map(identifiers.map(id => [id.metadata.id, id]));
    this.supportedAdapters = Array.from(this.identifiers.keys());
  }

  /**
   * Identifies the project adapter by delegating to each identifier in sequence.
   * Returns the first non-null result, or null if no identifier matches.
   * 
   * @param projectRoot - The root directory of the project to analyze
   * @returns The adapter name if any identifier matches, null otherwise
   */
  async identify(projectRoot: string): Promise<AdapterIdentifier | null> {
    for (const [id, identifier] of this.identifiers) {
      try {
        const result = await identifier.accept(projectRoot);
        if (result) {
          return identifier;
        }
      } catch (error) {
        // Continue to the next identifier if this one fails
        continue;
      }
    }
    
    return null;
  }

  getIdentifierById(id: string): AdapterIdentifier | null {
    return this.identifiers.get(id) || null;
  }

  getSupportedAdapters(): string[] {
    return this.supportedAdapters;
  }
}
