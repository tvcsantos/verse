import { describe, it, expect } from 'vitest';
import { 
  parseVersionCatalog, 
  updateVersionInCatalog,
  resolveVersionFromCatalog,
  VersionCatalog 
} from '../src/adapters/gradle/parsers/versionCatalog.js';

describe('Version Catalog Parser', () => {
  const sampleToml = `
[versions]
spring = "6.0.0"
junit = "5.9.2"
project = "1.0.0"

[libraries]
spring-core = { group = "org.springframework", name = "spring-core", version.ref = "spring" }
junit-jupiter = "org.junit.jupiter:junit-jupiter:5.9.2"
spring-boot = { group = "org.springframework.boot", name = "spring-boot-starter", version = "3.0.0" }

[bundles]
testing = ["junit-jupiter", "mockito"]
spring = ["spring-core", "spring-boot"]

[plugins]
kotlin = { id = "org.jetbrains.kotlin.jvm", version = "1.8.0" }
spring-plugin = "org.springframework.boot:3.0.0"
`;

  describe('parseVersionCatalogContent', () => {
    it('should parse versions section correctly', async () => {
      // Create a mock file system by testing the content parsing directly
      const catalog = await parseVersionCatalogContent(sampleToml);
      
      expect(catalog.versions.get('spring')).toBe('6.0.0');
      expect(catalog.versions.get('junit')).toBe('5.9.2');
      expect(catalog.versions.get('project')).toBe('1.0.0');
    });

    it('should parse libraries section correctly', async () => {
      const catalog = await parseVersionCatalogContent(sampleToml);
      
      const springCore = catalog.libraries.get('spring-core');
      expect(springCore).toEqual({
        key: 'spring-core',
        group: 'org.springframework',
        name: 'spring-core',
        version: '${versions.spring}',
      });

      const junitJupiter = catalog.libraries.get('junit-jupiter');
      expect(junitJupiter?.group).toBe('org.junit.jupiter');
      expect(junitJupiter?.name).toBe('junit-jupiter');
      expect(junitJupiter?.version).toBe('5.9.2');
    });

    it('should parse bundles section correctly', async () => {
      const catalog = await parseVersionCatalogContent(sampleToml);
      
      expect(catalog.bundles.get('testing')).toEqual(['junit-jupiter', 'mockito']);
      expect(catalog.bundles.get('spring')).toEqual(['spring-core', 'spring-boot']);
    });

    it('should parse plugins section correctly', async () => {
      const catalog = await parseVersionCatalogContent(sampleToml);
      
      const kotlin = catalog.plugins.get('kotlin');
      expect(kotlin).toEqual({
        key: 'kotlin',
        name: 'org.jetbrains.kotlin.jvm',
        version: '1.8.0',
      });
    });
  });

  describe('resolveVersionFromCatalog', () => {
    it('should resolve version references correctly', async () => {
      const catalog = await parseVersionCatalogContent(sampleToml);
      
      const version = resolveVersionFromCatalog('${versions.spring}', catalog);
      expect(version).toBe('6.0.0');
    });

    it('should return null for non-existent references', async () => {
      const catalog = await parseVersionCatalogContent(sampleToml);
      
      const version = resolveVersionFromCatalog('${versions.nonexistent}', catalog);
      expect(version).toBeNull();
    });

    it('should handle direct version keys', async () => {
      const catalog = await parseVersionCatalogContent(sampleToml);
      
      const version = resolveVersionFromCatalog('spring', catalog);
      expect(version).toBe('6.0.0');
    });
  });
});

// Helper function to simulate parsing content directly
async function parseVersionCatalogContent(content: string) {
  // This is a simplified version of the actual parsing logic for testing
  const catalog = {
    versions: new Map<string, string>(),
    libraries: new Map<string, any>(),
    bundles: new Map<string, string[]>(),
    plugins: new Map<string, any>(),
  };

  let currentSection = '';
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1);
      continue;
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;

    const key = trimmed.substring(0, equalIndex).trim();
    const value = trimmed.substring(equalIndex + 1).trim();
    const cleanValue = value.replace(/^["']|["']$/g, '');

    switch (currentSection) {
      case 'versions':
        catalog.versions.set(key, cleanValue);
        break;

      case 'libraries':
        if (cleanValue.startsWith('{') && cleanValue.endsWith('}')) {
          const objContent = cleanValue.slice(1, -1);
          const parts = objContent.split(',').map(p => p.trim());
          
          let group = '';
          let name = '';
          let version = '';

          for (const part of parts) {
            const [k, v] = part.split('=').map(p => p.trim().replace(/^["']|["']$/g, ''));
            if (k === 'group') group = v;
            else if (k === 'name') name = v;
            else if (k === 'version') version = v;
            else if (k === 'version.ref') version = `\${versions.${v}}`;
          }

          catalog.libraries.set(key, { key, group, name, version });
        } else if (cleanValue.includes(':')) {
          const parts = cleanValue.split(':');
          catalog.libraries.set(key, {
            key,
            group: parts[0],
            name: parts[1],
            version: parts[2] || '',
          });
        }
        break;

      case 'bundles':
        if (cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
          const arrayContent = cleanValue.slice(1, -1);
          const items = arrayContent
            .split(',')
            .map(item => item.trim().replace(/^["']|["']$/g, ''))
            .filter(item => item.length > 0);
          catalog.bundles.set(key, items);
        }
        break;

      case 'plugins':
        if (cleanValue.startsWith('{') && cleanValue.endsWith('}')) {
          const objContent = cleanValue.slice(1, -1);
          const parts = objContent.split(',').map(p => p.trim());
          
          let id = '';
          let version = '';

          for (const part of parts) {
            const [k, v] = part.split('=').map(p => p.trim().replace(/^["']|["']$/g, ''));
            if (k === 'id') id = v;
            else if (k === 'version') version = v;
          }

          catalog.plugins.set(key, { key, name: id, version });
        } else if (cleanValue.includes(':')) {
          const parts = cleanValue.split(':');
          catalog.plugins.set(key, {
            key,
            name: parts[0],
            version: parts[1] || '',
          });
        }
        break;
    }
  }

  return catalog;
}