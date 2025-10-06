import { promises as fs } from 'fs';
import { join, relative } from 'path';
import { 
  BaseAdapter,
  Module,
  DependencyRef
} from '../core.js';
import { parseSemVer, formatSemVer } from '../../semver/index.js';
import { 
  parseHierarchyDependencies, 
  getDependenciesOf,
} from './parsers/hierarchyDependencies.js';
import { HierarchyParseResult } from '../hierarchy.js';
import { SemVer } from 'semver';
import * as core from '@actions/core';

export interface GradleProperties {
  [key: string]: string;
}

export class GradleAdapter extends BaseAdapter {
  private hierarchyResult: HierarchyParseResult | null = null;

  constructor(private repoRoot: string) {
    super();
  }

  getName(): string {
    return 'gradle';
  }

  async detectModules(repoRoot: string): Promise<Module[]> {
    // Initialize hierarchy dependencies - this gives us all project information
    await this.initializeHierarchy(repoRoot);

    const hierarchyResult = this.hierarchyResult;

    if (!hierarchyResult) {
      throw new Error('Could not initialize hierarchy dependencies. Please ensure init-hierarchy-deps.gradle.kts exists and gradle is available.');
    }
    
    // Create modules from hierarchy data
    return hierarchyResult.projectIds.map(projectId => {
      const projectNode = hierarchyResult.hierarchy[projectId];
      const moduleName = projectId === ':' ? 'root' : projectId.replace(/^:/, '').replace(/:/g, '/');
      const relativePath = projectId === ':' ? '' : projectId.replace(/^:/, '').replace(/:/g, '/');

      return {
        id: moduleName,
        path: projectNode.path,
        relativePath,
        type: projectId === ':' ? 'root' as const : 'module' as const,
      };
    });
  }

  async readVersion(module: Module): Promise<SemVer> {
    // Read version from gradle.properties - our standardized approach
    const gradlePropsVersion = await this.readVersionFromGradleProperties(module);
    if (gradlePropsVersion) {
      return gradlePropsVersion;
    }

    // Default to 0.0.0 if no version found
    return parseSemVer('0.0.0');
  }

  async writeVersion(module: Module, newVersion: SemVer): Promise<void> {
    // Update gradle.properties - our standardized approach
    const hasGradleProps = await this.hasVersionInGradleProperties(module);
    if (hasGradleProps) {
      await this.updateVersionInGradleProperties(module, newVersion);
      return;
    }

    // Create gradle.properties as fallback
    // With hierarchy approach, we standardize on gradle.properties for version management
    await this.createGradlePropertiesWithVersion(module, newVersion);
  }

  async getDependencies(module: Module): Promise<DependencyRef[]> {
    // With hierarchy dependencies, we have all the causal relationships
    // No need to parse individual build files
    if (!this.hierarchyResult) {
      throw new Error('Hierarchy dependencies not initialized. Cannot determine dependencies.');
    }
    
    return this.getDependenciesFromHierarchy(module);
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

  /**
   * Initialize hierarchy dependencies by executing the gradle hierarchy command
   */
  private async initializeHierarchy(repoRoot: string): Promise<void> {
    try {
      this.hierarchyResult = await parseHierarchyDependencies(repoRoot);
    } catch (error) {
      core.warning(`Could not initialize hierarchy dependencies: ${error instanceof Error ? error.message : String(error)}`);
      // Continue without hierarchy dependencies - fallback to existing parsing methods
      this.hierarchyResult = null;
    }
  }

  /**
   * Get dependencies from hierarchy result
   */
  private getDependenciesFromHierarchy(module: Module): DependencyRef[] {
    if (!this.hierarchyResult) {
      return [];
    }

    // Convert module path to gradle project path
    const modulePath = relative(this.repoRoot, module.path);
    const projectPath = modulePath === '' ? ':' : `:${modulePath.replace(/\//g, ':')}`;
    
    // Get dependencies for this project from hierarchy
    const projectDependencies = getDependenciesOf(this.hierarchyResult, projectPath);
    
    return projectDependencies.map(depPath => ({
      id: depPath === ':' ? 'root' : depPath.replace(/^:/, '').replace(/:/g, '/'),
      constraint: '',
    }));
  }
}