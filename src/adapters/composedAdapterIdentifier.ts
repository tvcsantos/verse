import { AdapterIdentifier } from './identifier.js';

/**
 * Composed adapter identifier that chains multiple adapter identifiers.
 * Iterates through a list of identifiers until one returns a non-null result.
 */
export class ComposedAdapterIdentifier implements AdapterIdentifier {
  private identifiers: AdapterIdentifier[];

  /**
   * Creates a composed adapter identifier.
   * 
   * @param identifiers - Array of adapter identifiers to chain
   */
  constructor(identifiers: AdapterIdentifier[]) {
    this.identifiers = identifiers;
  }

  /**
   * Identifies the project adapter by delegating to each identifier in sequence.
   * Returns the first non-null result, or null if no identifier matches.
   * 
   * @param projectRoot - The root directory of the project to analyze
   * @returns The adapter name if any identifier matches, null otherwise
   */
  async identify(projectRoot: string): Promise<string | null> {
    for (const identifier of this.identifiers) {
      try {
        const result = await identifier.identify(projectRoot);
        if (result !== null) {
          return result;
        }
      } catch (error) {
        // Continue to the next identifier if this one fails
        continue;
      }
    }
    
    return null;
  }

  /**
   * Adds a new identifier to the chain.
   * 
   * @param identifier - The adapter identifier to add
   */
  addIdentifier(identifier: AdapterIdentifier): void {
    this.identifiers.push(identifier);
  }

  /**
   * Gets all registered identifiers.
   * 
   * @returns Array of registered adapter identifiers
   */
  getIdentifiers(): AdapterIdentifier[] {
    return [...this.identifiers];
  }
}