import { SemVer } from "semver";

export interface Module {
  id: string;
  path: string;
  relativePath: string;
  type: 'module' | 'root';
}

export interface DependencyRef {
  id: string;
}

export interface ModuleChange {
  module: Module;
  fromVersion: SemVer;
  toVersion: SemVer;
  bumpType: BumpType;
  reason: ChangeReason;
}

export type BumpType = 'major' | 'minor' | 'patch' | 'none';

export type ChangeReason = 'commits' | 'dependency' | 'cascade';

export interface CommitInfo {
  hash: string;
  type: string;
  scope?: string;
  subject: string;
  body?: string;
  breaking: boolean;
  module?: string;
}

export interface LanguageAdapter {
  /**
   * Detect all modules in the repository
   */
  detectModules(repoRoot: string): Promise<Module[]>;

  /**
   * Read the current version of a module
   */
  readVersion(module: Module): Promise<SemVer>;

  /**
   * Write a new version to a module
   */
  writeVersion(module: Module, newVersion: SemVer): Promise<void>;

  /**
   * Get dependencies for a module
   */
  getDependencies(module: Module): Promise<DependencyRef[]>;

  /**
   * Update dependency constraints when a dependency's version changes
   */
  updateDependentConstraints?(
    module: Module,
    dep: DependencyRef,
    newVersion: SemVer
  ): Promise<void>;

  /**
   * Get the adapter name
   */
  getName(): string;
}

export abstract class BaseAdapter implements LanguageAdapter {
  abstract detectModules(repoRoot: string): Promise<Module[]>;
  abstract readVersion(module: Module): Promise<SemVer>;
  abstract writeVersion(module: Module, newVersion: SemVer): Promise<void>;
  abstract getDependencies(module: Module): Promise<DependencyRef[]>;
  abstract getName(): string;

  async updateDependentConstraints?(
    module: Module,
    dep: DependencyRef,
    newVersion: SemVer
  ): Promise<void> {
    // Default implementation does nothing
    // Adapters can override this if they support dependency constraint updates
  }
}