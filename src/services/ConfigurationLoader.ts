import * as core from '@actions/core';
import { Config, loadConfig } from '../config/index.js';

export class ConfigurationLoader {
  private config: Config | null = null;

  async loadConfiguration(configPath: string, repoRoot: string): Promise<Config> {
    core.info(`📋 Loading configuration from ${configPath}...`);
    
    this.config = await loadConfig(configPath, repoRoot);
    core.info(`✅ Configuration loaded successfully`);
    
    return this.config;
  }
}