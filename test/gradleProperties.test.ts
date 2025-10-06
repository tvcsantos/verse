import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { parseGradleProperties, updateModuleVersionInGradleProperties } from '../src/adapters/gradle/parsers/gradleProperties.js';
import { parseSemVer } from '../src/semver/index.js';

// Test directory
const testDir = join(process.cwd(), 'test-temp');

describe('Gradle Properties Parser', () => {
  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('parseGradleProperties', () => {
    it('should parse all module versions correctly', async () => {
      const properties = `# Project versions
version=1.2.3
x.version=2.0.0
x.y.version=3.1.0
z.version=4.5.6
my.module.version=1.0.0-beta.1
`;

      await fs.writeFile(join(testDir, 'gradle.properties'), properties);

      const result = await parseGradleProperties(testDir);

      expect(result.rootVersion?.major).toBe(1);
      expect(result.rootVersion?.minor).toBe(2);
      expect(result.rootVersion?.patch).toBe(3);

      expect(result.moduleVersions).toHaveLength(5);

      // Check root module
      const rootModule = result.moduleVersions.find(m => m.moduleId === ':');
      expect(rootModule?.moduleId).toBe(':');
      expect(rootModule?.version.major).toBe(1);
      expect(rootModule?.version.minor).toBe(2);
      expect(rootModule?.version.patch).toBe(3);

      // Check other modules
      const xModule = result.moduleVersions.find(m => m.moduleId === ':x');
      expect(xModule?.moduleId).toBe(':x');
      expect(xModule?.version.major).toBe(2);
      expect(xModule?.version.minor).toBe(0);
      expect(xModule?.version.patch).toBe(0);

      const xyModule = result.moduleVersions.find(m => m.moduleId === ':x:y');
      expect(xyModule?.moduleId).toBe(':x:y');
      expect(xyModule?.version.major).toBe(3);
      expect(xyModule?.version.minor).toBe(1);
      expect(xyModule?.version.patch).toBe(0);

      const myModule = result.moduleVersions.find(m => m.moduleId === ':my:module');
      expect(myModule?.moduleId).toBe(':my:module');
      expect(myModule?.version.major).toBe(1);
      expect(myModule?.version.minor).toBe(0);
      expect(myModule?.version.patch).toBe(0);
      expect(myModule?.version.prerelease).toEqual(['beta', 1]);
    });

    it('should handle empty properties file', async () => {
      await fs.writeFile(join(testDir, 'gradle.properties'), '');

      const result = await parseGradleProperties(testDir);

      expect(result.rootVersion).toBeUndefined();
      expect(result.moduleVersions).toHaveLength(0);
    });

    it('should throw error for missing file', async () => {
      await expect(parseGradleProperties(testDir)).rejects.toThrow('gradle.properties file not found');
    });

    it('should throw error for invalid version format', async () => {
      await fs.writeFile(join(testDir, 'gradle.properties'), 'version=invalid-version');

      await expect(parseGradleProperties(testDir)).rejects.toThrow('Invalid version format');
    });
  });

  describe('updateModuleVersionInGradleProperties', () => {
    it('should update existing version', async () => {
      const properties = `version=1.0.0
x.version=2.0.0`;

      await fs.writeFile(join(testDir, 'gradle.properties'), properties);

      await updateModuleVersionInGradleProperties(testDir, ':x', parseSemVer('3.1.0'));

      const content = await fs.readFile(join(testDir, 'gradle.properties'), 'utf8');
      expect(content).toContain('x.version=3.1.0');
      expect(content).toContain('version=1.0.0'); // Should not change other versions
    });

    it('should add new version property', async () => {
      const properties = `version=1.0.0`;

      await fs.writeFile(join(testDir, 'gradle.properties'), properties);

      await updateModuleVersionInGradleProperties(testDir, ':new:module', parseSemVer('2.0.0'));

      const content = await fs.readFile(join(testDir, 'gradle.properties'), 'utf8');
      expect(content).toContain('new.module.version=2.0.0');
    });

    it('should create new file if it does not exist', async () => {
      await updateModuleVersionInGradleProperties(testDir, ':', parseSemVer('1.0.0'));

      const content = await fs.readFile(join(testDir, 'gradle.properties'), 'utf8');
      expect(content).toBe('version=1.0.0\n');
    });
  });
});