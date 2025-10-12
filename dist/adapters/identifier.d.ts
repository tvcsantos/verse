/**
 * Interface for adapter identification.
 * Each adapter should implement this interface to provide auto-discovery capabilities.
 */
export interface AdapterIdentifier {
    /**
     * Identifies if the current project is compatible with this adapter.
     *
     * @param projectRoot - The root directory of the project to analyze
     * @returns The adapter name if this adapter is applicable, null otherwise
     */
    identify(projectRoot: string): Promise<string | null>;
}
//# sourceMappingURL=identifier.d.ts.map