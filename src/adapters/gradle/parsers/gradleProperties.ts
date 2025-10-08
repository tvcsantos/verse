/**
 * Convert version property name to module path
 * Examples:
 * - version -> ":" (root)
 * - x.version -> ":x"
 * - x.y.version -> ":x:y"
 */
function versionPropertyNameToModuleId(propertyName: string): string {
  if (propertyName === 'version') {
    return ':';
  }
  
  // Remove '.version' suffix
  const nameWithoutSuffix = propertyName.replace(/\.version$/, '');
  
  // Convert dot-separated to module path: "x.y" -> ":x:y"
  return ':' + nameWithoutSuffix.replaceAll('.', ':');
}

/**
 * Convert module path to version property name
 * Examples:
 * - ":" -> "version"
 * - ":x" -> "x.version"
 * - ":x:y" -> "x.y.version"
 */
export function moduleIdToVersionPropertyName(moduleId: string): string {
  if (moduleId === ':') {
    return 'version';
  }

  const name = moduleId.split(':').at(-1);
  if (!name) {
    throw new Error(`Invalid module ID: ${moduleId}`);
  }
  
  return name + '.version';
}
