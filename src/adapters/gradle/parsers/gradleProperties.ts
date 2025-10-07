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
  
  // Remove leading colon and convert colons to dots: ":x:y" -> "x.y"
  const dotPath = moduleId.substring(1).replaceAll(':', '.');
  
  return dotPath + '.version';
}
