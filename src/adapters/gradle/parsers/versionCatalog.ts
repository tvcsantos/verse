import { promises as fs } from 'fs';
import { join } from 'path';
import { SemVer } from '../../../adapters/core.js';
import { parseSemVer, formatSemVer } from '../../../semver/index.js';

export interface VersionCatalogEntry {
  key: string;
  version: string;
  group?: string;
  name?: string;
}

export interface VersionCatalog {
  versions: Map<string, string>;
  libraries: Map<string, VersionCatalogEntry>;
  bundles: Map<string, string[]>;
  plugins: Map<string, VersionCatalogEntry>;
}

/**
 * Parse libs.versions.toml file (Gradle version catalog)
 */
export async function parseVersionCatalog(catalogPath: string): Promise<VersionCatalog> {
  try {
    const content = await fs.readFile(catalogPath, 'utf8');
    return parseVersionCatalogContent(content);
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
      return {
        versions: new Map(),
        libraries: new Map(),
        bundles: new Map(),
        plugins: new Map(),
      };
    }
    throw error;
  }
}

/**
 * Parse version catalog TOML content
 */
function parseVersionCatalogContent(content: string): VersionCatalog {
  const catalog: VersionCatalog = {
    versions: new Map(),
    libraries: new Map(),
    bundles: new Map(),
    plugins: new Map(),
  };

  let currentSection = '';
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Section headers
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1);
      continue;
    }

    // Parse key-value pairs
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;

    const key = trimmed.substring(0, equalIndex).trim();
    const value = trimmed.substring(equalIndex + 1).trim();

    // Remove quotes from value
    const cleanValue = value.replace(/^["']|["']$/g, '');

    switch (currentSection) {
      case 'versions':
        catalog.versions.set(key, cleanValue);
        break;

      case 'libraries':
        const libEntry = parseLibraryEntry(key, cleanValue);
        if (libEntry) {
          catalog.libraries.set(key, libEntry);
        }
        break;

      case 'bundles':
        const bundleLibs = parseBundleEntry(cleanValue);
        catalog.bundles.set(key, bundleLibs);
        break;

      case 'plugins':
        const pluginEntry = parsePluginEntry(key, cleanValue);
        if (pluginEntry) {
          catalog.plugins.set(key, pluginEntry);
        }
        break;
    }
  }

  return catalog;
}

/**
 * Parse library entry from version catalog
 */
function parseLibraryEntry(key: string, value: string): VersionCatalogEntry | null {
  // Handle object notation: { group = "com.example", name = "lib", version = "1.0.0" }
  if (value.startsWith('{') && value.endsWith('}')) {
    const objContent = value.slice(1, -1);
    const parts = objContent.split(',').map(p => p.trim());
    
    let group = '';
    let name = '';
    let version = '';

    for (const part of parts) {
      const [k, v] = part.split('=').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (k === 'group') group = v;
      else if (k === 'name') name = v;
      else if (k === 'version') version = v;
    }

    if (group && name) {
      return {
        key,
        version: version.startsWith('$') ? version : version,
        group,
        name,
      };
    }
  }

  // Handle string notation: "group:name:version"
  if (value.includes(':')) {
    const parts = value.split(':');
    if (parts.length >= 2) {
      return {
        key,
        version: parts[2] || '',
        group: parts[0],
        name: parts[1],
      };
    }
  }

  return null;
}

/**
 * Parse bundle entry from version catalog
 */
function parseBundleEntry(value: string): string[] {
  // Handle array notation: ["lib1", "lib2", "lib3"]
  if (value.startsWith('[') && value.endsWith(']')) {
    const arrayContent = value.slice(1, -1);
    return arrayContent
      .split(',')
      .map(item => item.trim().replace(/^["']|["']$/g, ''))
      .filter(item => item.length > 0);
  }

  return [];
}

/**
 * Parse plugin entry from version catalog
 */
function parsePluginEntry(key: string, value: string): VersionCatalogEntry | null {
  // Handle object notation: { id = "com.example.plugin", version = "1.0.0" }
  if (value.startsWith('{') && value.endsWith('}')) {
    const objContent = value.slice(1, -1);
    const parts = objContent.split(',').map(p => p.trim());
    
    let id = '';
    let version = '';

    for (const part of parts) {
      const [k, v] = part.split('=').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (k === 'id') id = v;
      else if (k === 'version') version = v;
    }

    if (id) {
      return {
        key,
        version: version.startsWith('$') ? version : version,
        name: id,
      };
    }
  }

  // Handle string notation: "id:version"
  if (value.includes(':')) {
    const parts = value.split(':');
    return {
      key,
      version: parts[1] || '',
      name: parts[0],
    };
  }

  return null;
}

/**
 * Find version catalog file in a module
 */
export async function findVersionCatalogFile(modulePath: string): Promise<string | null> {
  const candidates = [
    'gradle/libs.versions.toml',
    'libs.versions.toml'
  ];

  for (const candidate of candidates) {
    const catalogPath = join(modulePath, candidate);
    try {
      await fs.access(catalogPath);
      return catalogPath;
    } catch {
      // File doesn't exist, try next
    }
  }

  return null;
}

/**
 * Update version in version catalog
 */
export async function updateVersionInCatalog(
  catalogPath: string,
  versionKey: string,
  newVersion: SemVer
): Promise<void> {
  const content = await fs.readFile(catalogPath, 'utf8');
  const versionString = formatSemVer(newVersion);
  
  // Find the [versions] section and update the specific version
  const lines = content.split('\n');
  let inVersionsSection = false;
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '[versions]') {
      inVersionsSection = true;
      continue;
    }
    
    if (line.startsWith('[') && line !== '[versions]') {
      inVersionsSection = false;
      continue;
    }
    
    if (inVersionsSection && line.startsWith(`${versionKey} =`)) {
      // Update the version
      lines[i] = lines[i].replace(/= *["'][^"']*["']/, `= "${versionString}"`);
      updated = true;
      break;
    }
  }

  if (!updated) {
    // Add the version if not found
    const versionsIndex = lines.findIndex(line => line.trim() === '[versions]');
    if (versionsIndex !== -1) {
      lines.splice(versionsIndex + 1, 0, `${versionKey} = "${versionString}"`);
    } else {
      // Add [versions] section if it doesn't exist
      lines.unshift('[versions]', `${versionKey} = "${versionString}"`, '');
    }
  }

  await fs.writeFile(catalogPath, lines.join('\n'), 'utf8');
}

/**
 * Get version from catalog using version reference
 */
export function resolveVersionFromCatalog(
  versionRef: string,
  catalog: VersionCatalog
): string | null {
  // Handle version references like "${versions.mylib}"
  if (versionRef.startsWith('${versions.')) {
    const versionKey = versionRef.slice(11, -1); // Remove "${versions." and "}"
    return catalog.versions.get(versionKey) || null;
  }
  
  // Handle direct references like "mylib"
  if (catalog.versions.has(versionRef)) {
    return catalog.versions.get(versionRef) || null;
  }
  
  return null;
}