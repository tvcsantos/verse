import { promises as fs } from 'fs';
import { parseSemVer, isValidVersionString } from '../semver/index.js';
import { SemVer } from 'semver';

/**
 * Parse a generic properties file into key-value pairs
 * Supports both '=' and ':' as delimiters
 * Skips comments (lines starting with # or !) and empty lines
 */
export async function parseProperties(propertiesPath: string): Promise<Map<string, string>> {
  const content = await fs.readFile(propertiesPath, 'utf8');
  const properties = new Map<string, string>();
  
  // Parse all properties line by line
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip comments and empty lines
    if (trimmedLine.startsWith('#') || trimmedLine.startsWith('!') || !trimmedLine) {
      continue;
    }
    
    // Parse property: key=value or key:value
    const match = trimmedLine.match(/^([^=:]+)[=:]\s*(.+)$/);
    if (!match) {
      continue;
    }
    
    const [, key, value] = match;
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    
    properties.set(trimmedKey, trimmedValue);
  }
  
  return properties;
}

/**
 * Parse properties file and extract all version properties with SemVer values
 * @param propertiesPath Path to the properties file
 * @returns Map of version property keys to SemVer objects
 */
export async function parseVersionProperties(
  propertiesPath: string
): Promise<Map<string, SemVer>> {
  const properties = await parseProperties(propertiesPath);
  const versionProperties = new Map<string, SemVer>();
  
  for (const [key, value] of properties) {
    // Check if key matches version pattern (ends with '.version' or is exactly 'version')
    if (!key.endsWith('.version') && key !== 'version') {
      continue;
    }
    
    // Validate and parse version
    if (!isValidVersionString(value)) {
      throw new Error(`Invalid version format in properties file: "${key}=${value}". Expected semantic version format (e.g., "1.2.3", "2.0.0-beta.1")`);
    }
    
    const semVer = parseSemVer(value);
    versionProperties.set(key, semVer);
  }
  
  return versionProperties;
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Update or insert a property in a properties file
 * @param propertiesPath Path to the properties file
 * @param key Property key to update or insert
 * @param value Property value to set
 */
export async function upsertProperty(
  propertiesPath: string,
  key: string,
  value: string
): Promise<void> {
  const exists = await fileExists(propertiesPath);
  
  let updatedContent: string
  if (exists) {
    // File exists, read and update it
    const content = await fs.readFile(propertiesPath, 'utf8');
    
    // Look for existing property (escape special regex characters in key)
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const propertyRegex = new RegExp(`^${escapedKey}\\s*[=:]\\s*.*$`, 'm');
    
    if (propertyRegex.test(content)) {
      // Update existing property
      updatedContent = content.replace(propertyRegex, `${key}=${value}`);
    } else {
      // Add new property at the end
      const separator = content.endsWith('\n') ? '' : '\n';
      updatedContent = content + separator + `${key}=${value}\n`;
    }
  } else {
    // File doesn't exist, create new properties file
    updatedContent = `${key}=${value}\n`;
  }

  await fs.writeFile(propertiesPath, updatedContent, 'utf8');
}