import { promises as fs } from 'fs';
import { fileExists } from './file.js';

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
  await upsertProperties(propertiesPath, new Map([[key, value]]));
}

/**
 * Update or insert multiple properties in a properties file in one operation
 * @param propertiesPath Path to the properties file
 * @param properties Map of property keys to values to update or insert
 */
export async function upsertProperties(
  propertiesPath: string,
  properties: Map<string, string>
): Promise<void> {
  if (properties.size === 0) {
    return; // Nothing to update
  }

  const exists = await fileExists(propertiesPath);
  
  let updatedContent: string;
  
  if (exists) {
    // File exists, read and update it
    let content = await fs.readFile(propertiesPath, 'utf8');
    
    // Process each property update
    for (const [key, value] of properties) {
      // Look for existing property (escape special regex characters in key)
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const propertyRegex = new RegExp(`^${escapedKey}\\s*[=:]\\s*.*$`, 'm');
      
      if (propertyRegex.test(content)) {
        // Update existing property
        content = content.replace(propertyRegex, `${key}=${value}`);
      } else {
        // Add new property at the end
        const separator = content.endsWith('\n') ? '' : '\n';
        content = content + separator + `${key}=${value}\n`;
      }
    }
    
    updatedContent = content;
  } else {
    // File doesn't exist, create new properties file
    const lines: string[] = [];
    for (const [key, value] of properties) {
      lines.push(`${key}=${value}`);
    }
    updatedContent = lines.join('\n') + '\n';
  }

  await fs.writeFile(propertiesPath, updatedContent, 'utf8');
}