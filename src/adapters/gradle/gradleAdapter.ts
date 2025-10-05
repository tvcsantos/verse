import { promises as fs } from 'fs';
import { join, resolve, relative } from 'path';
import { 
  BaseAdapter,
  Module,
  SemVer,
  DependencyRef
} from '../core.js';
import { parseSemVer, formatSemVer } from '../../semver/index.js';
import { getAllGradleModules } from './parsers/settings.js';
import { parseBuildGradleKts, updateVersionInKotlinDSL } from './parsers/buildGradleKts.js';
import { parseBuildGradleGroovy, updateVersionInGroovy } from './parsers/buildGradleGroovy.js';
import { 
  parseVersionCatalog, 
  findVersionCatalogFile, 
  updateVersionInCatalog,
  resolveVersionFromCatalog,
  VersionCatalog 
} from './parsers/versionCatalog.js';

export interface GradleProperties {
  [key: string]: string;
}

export class GradleAdapter extends BaseAdapter {
  private versionCatalog: VersionCatalog | null = null;
  private versionCatalogPath: string | null = null;

  constructor(private repoRoot: string) {
    super();
  }

  getName(): string {
    return 'gradle';
  }

  async detectModules(repoRoot: string): Promise<Module[]> {
    // Initialize version catalog if available
    await this.initializeVersionCatalog(repoRoot);
    
    const gradleModules = await getAllGradleModules(repoRoot);
    
    return gradleModules.map(gradleModule => ({
      name: gradleModule.name,
      path: resolve(repoRoot, gradleModule.path),
      relativePath: gradleModule.path,
      type: gradleModule.name === 'root' ? 'root' : 'module',
    }));
  }

  async readVersion(module: Module): Promise<SemVer> {
    // Try version catalog first if available
    const catalogVersion = await this.readVersionFromCatalog(module);
    if (catalogVersion) {
      return catalogVersion;
    }

    // Try gradle.properties
    const gradlePropsVersion = await this.readVersionFromGradleProperties(module);
    if (gradlePropsVersion) {
      return gradlePropsVersion;
    }

    // Try build.gradle.kts
    const kotlinBuildFile = join(module.path, 'build.gradle.kts');
    const kotlinResult = await parseBuildGradleKts(kotlinBuildFile);
    if (kotlinResult.version) {
      return kotlinResult.version;
    }

    // Try build.gradle
    const groovyBuildFile = join(module.path, 'build.gradle');
    const groovyResult = await parseBuildGradleGroovy(groovyBuildFile);
    if (groovyResult.version) {
      return groovyResult.version;
    }

    // Default to 0.0.0 if no version found
    return { major: 0, minor: 0, patch: 0 };
  }

  async writeVersion(module: Module, newVersion: SemVer): Promise<void> {
    // Try to update version catalog first if available
    const catalogUpdated = await this.updateVersionInCatalog(module, newVersion);
    if (catalogUpdated) {
      return;
    }

    // Try to update gradle.properties
    const hasGradleProps = await this.hasVersionInGradleProperties(module);
    if (hasGradleProps) {
      await this.updateVersionInGradleProperties(module, newVersion);
      return;
    }

    // Try build.gradle.kts
    const kotlinBuildFile = join(module.path, 'build.gradle.kts');
    try {
      await fs.access(kotlinBuildFile);
      await updateVersionInKotlinDSL(kotlinBuildFile, newVersion);
      return;
    } catch {
      // File doesn't exist
    }

    // Try build.gradle
    const groovyBuildFile = join(module.path, 'build.gradle');
    try {
      await fs.access(groovyBuildFile);
      await updateVersionInGroovy(groovyBuildFile, newVersion);
      return;
    } catch {
      // File doesn't exist
    }

    // Create gradle.properties as fallback
    await this.createGradlePropertiesWithVersion(module, newVersion);
  }

  async getDependencies(module: Module): Promise<DependencyRef[]> {
    const dependencies: DependencyRef[] = [];

    // Try build.gradle.kts
    const kotlinBuildFile = join(module.path, 'build.gradle.kts');
    try {
      const kotlinResult = await parseBuildGradleKts(kotlinBuildFile);
      for (const dep of kotlinResult.dependencies) {
        if (dep.isProject && dep.projectPath) {
          dependencies.push({
            name: dep.projectPath.replace(/^:/, '').replace(/:/g, '/'),
            type: 'project',
            constraint: '',
            scope: this.mapGradleConfigToScope(dep.configuration),
          });
        } else {
          // Resolve version catalog references
          const resolvedNotation = this.resolveDependencyVersion(dep.notation);
          const parts = resolvedNotation.split(':');
          if (parts.length >= 2) {
            dependencies.push({
              name: `${parts[0]}:${parts[1]}`,
              type: 'external',
              constraint: parts[2] || '',
              scope: this.mapGradleConfigToScope(dep.configuration),
            });
          }
        }
      }
    } catch {
      // Try build.gradle instead
      const groovyBuildFile = join(module.path, 'build.gradle');
      try {
        const groovyResult = await parseBuildGradleGroovy(groovyBuildFile);
        for (const dep of groovyResult.dependencies) {
          if (dep.isProject && dep.projectPath) {
            dependencies.push({
              name: dep.projectPath.replace(/^:/, '').replace(/:/g, '/'),
              type: 'project',
              constraint: '',
              scope: this.mapGradleConfigToScope(dep.configuration),
            });
          } else {
            // Resolve version catalog references
            const resolvedNotation = this.resolveDependencyVersion(dep.notation);
            const parts = resolvedNotation.split(':');
            if (parts.length >= 2) {
              dependencies.push({
                name: `${parts[0]}:${parts[1]}`,
                type: 'external',
                constraint: parts[2] || '',
                scope: this.mapGradleConfigToScope(dep.configuration),
              });
            }
          }
        }
      } catch {
        // No build file found or error parsing
      }
    }

    return dependencies;
  }

  private async readVersionFromGradleProperties(module: Module): Promise<SemVer | null> {
    try {
      const gradleProps = await this.readGradleProperties(module);
      if (gradleProps.version) {
        return parseSemVer(gradleProps.version);
      }
    } catch {
      // File doesn't exist or error reading
    }
    return null;
  }

  private async hasVersionInGradleProperties(module: Module): Promise<boolean> {
    try {
      const gradleProps = await this.readGradleProperties(module);
      return !!gradleProps.version;
    } catch {
      return false;
    }
  }

  private async readGradleProperties(module: Module): Promise<GradleProperties> {
    const gradlePropsPath = join(module.path, 'gradle.properties');
    const content = await fs.readFile(gradlePropsPath, 'utf8');
    
    const properties: GradleProperties = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          properties[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    
    return properties;
  }

  private async updateVersionInGradleProperties(
    module: Module,
    newVersion: SemVer
  ): Promise<void> {
    const gradlePropsPath = join(module.path, 'gradle.properties');
    const versionString = formatSemVer(newVersion);
    
    try {
      const content = await fs.readFile(gradlePropsPath, 'utf8');
      const lines = content.split('\n');
      
      let updated = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('version=') || line.trim().startsWith('version ')) {
          lines[i] = `version=${versionString}`;
          updated = true;
          break;
        }
      }
      
      if (!updated) {
        lines.push(`version=${versionString}`);
      }
      
      await fs.writeFile(gradlePropsPath, lines.join('\n'), 'utf8');
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
        // File doesn't exist, create it
        await this.createGradlePropertiesWithVersion(module, newVersion);
      } else {
        throw error;
      }
    }
  }

  private async createGradlePropertiesWithVersion(
    module: Module,
    newVersion: SemVer
  ): Promise<void> {
    const gradlePropsPath = join(module.path, 'gradle.properties');
    const versionString = formatSemVer(newVersion);
    const content = `version=${versionString}\n`;
    
    await fs.writeFile(gradlePropsPath, content, 'utf8');
  }

  private mapGradleConfigToScope(
    configuration: string
  ): 'implementation' | 'api' | 'testImplementation' | 'compileOnly' | 'runtimeOnly' {
    switch (configuration) {
      case 'api':
        return 'api';
      case 'testImplementation':
      case 'testCompile':
        return 'testImplementation';
      case 'compileOnly':
      case 'provided':
        return 'compileOnly';
      case 'runtimeOnly':
      case 'runtime':
        return 'runtimeOnly';
      default:
        return 'implementation';
    }
  }

  /**
   * Initialize version catalog if it exists
   */
  private async initializeVersionCatalog(repoRoot: string): Promise<void> {
    this.versionCatalogPath = await findVersionCatalogFile(repoRoot);
    
    if (this.versionCatalogPath) {
      this.versionCatalog = await parseVersionCatalog(this.versionCatalogPath);
    }
  }

  /**
   * Read version from version catalog
   */
  private async readVersionFromCatalog(module: Module): Promise<SemVer | null> {
    if (!this.versionCatalog || !this.versionCatalogPath) {
      return null;
    }

    // Try to find version by module name
    const versionKey = this.getVersionKeyForModule(module);
    const versionValue = this.versionCatalog.versions.get(versionKey);
    
    if (versionValue) {
      try {
        return parseSemVer(versionValue);
      } catch {
        // Invalid version format
      }
    }

    return null;
  }

  /**
   * Update version in version catalog
   */
  private async updateVersionInCatalog(module: Module, newVersion: SemVer): Promise<boolean> {
    if (!this.versionCatalog || !this.versionCatalogPath) {
      return false;
    }

    const versionKey = this.getVersionKeyForModule(module);
    
    // Check if this module's version is managed by the catalog
    if (this.versionCatalog.versions.has(versionKey)) {
      await updateVersionInCatalog(this.versionCatalogPath, versionKey, newVersion);
      
      // Update our cached version catalog
      this.versionCatalog.versions.set(versionKey, formatSemVer(newVersion));
      
      return true;
    }

    return false;
  }

  /**
   * Get version key for a module (used in version catalog)
   */
  private getVersionKeyForModule(module: Module): string {
    if (module.name === 'root') {
      return 'project'; // Common convention for root project version
    }
    
    // Convert module name to version catalog key format
    // e.g., "my-module" -> "myModule" or "my_module"
    return module.name.replace(/-/g, '');
  }

  /**
   * Enhanced dependency parsing that considers version catalog references
   */
  private resolveDependencyVersion(dependencyNotation: string): string {
    if (!this.versionCatalog) {
      return dependencyNotation;
    }

    // Handle version catalog library references like "libs.mylib"
    if (dependencyNotation.startsWith('libs.')) {
      const libKey = dependencyNotation.substring(5);
      const libEntry = this.versionCatalog.libraries.get(libKey);
      
      if (libEntry && libEntry.group && libEntry.name) {
        let version = libEntry.version;
        
        // Resolve version reference if it's a variable
        if (version.startsWith('${')) {
          version = resolveVersionFromCatalog(version, this.versionCatalog) || version;
        }
        
        return `${libEntry.group}:${libEntry.name}:${version}`;
      }
    }

    return dependencyNotation;
  }
}