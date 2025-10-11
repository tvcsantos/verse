import * as core from '@actions/core';
import { VerseRunner, RunnerOptions } from '../runner.js';
import { join } from 'path';

/**
 * Parse comma-separated input values
 */
function parseCommaSeparated(input: string): string[] {
  return input
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

export function getGitHubActionPath(relativePath: string): string {
  const basePath = process.env['GITHUB_ACTION_PATH'];
  if (!basePath) throw new Error("GITHUB_ACTION_PATH environment variable is not set");
  return join(basePath, relativePath);
}

/**
 * Parse boolean input
 */
function parseBooleanInput(input: string): boolean {
  return input.toLowerCase() === 'true';
}

/**
 * Main entry point for VERSE GitHub Action
 */
export async function run(): Promise<void> {
  try {
    // Get inputs
    const releaseBranches = parseCommaSeparated(
      core.getInput('release-branches') || 'main,master'
    );
    const dryRun = parseBooleanInput(core.getInput('dry-run'));
    const fetchDepth = parseInt(core.getInput('fetch-depth') || '0', 10);
    const adapter = core.getInput('adapter') || 'gradle';
    const configPath = core.getInput('config-path') || '.versioningrc.json';
    const createReleases = parseBooleanInput(core.getInput('create-releases'));
    const pushTags = parseBooleanInput(core.getInput('push-tags'));
    const prereleaseMode = parseBooleanInput(core.getInput('prerelease-mode'));
    const prereleaseId = core.getInput('prerelease-id') || 'alpha';
    const bumpUnchanged = parseBooleanInput(core.getInput('bump-unchanged'));
    const addBuildMetadata = parseBooleanInput(core.getInput('add-build-metadata'));
    const timestampVersions = parseBooleanInput(core.getInput('timestamp-versions'));
    const gradleSnapshot = parseBooleanInput(core.getInput('gradle-snapshot'));
    const pushChanges = parseBooleanInput(core.getInput('push-changes'));

    // Get repository root (GitHub Actions sets GITHUB_WORKSPACE)
    const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();

    // Print cool ASCII art
    core.info('');
    core.info('██╗   ██╗███████╗██████╗ ███████╗███████╗');
    core.info('██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝');
    core.info('██║   ██║█████╗  ██████╔╝███████╗█████╗  ');
    core.info('╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝  ');
    core.info(' ╚████╔╝ ███████╗██║  ██║███████║███████╗');
    core.info('  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝');
    core.info('');
    core.info('🌌 Version Engine for Repo Semantic Evolution');
    core.info('   Orchestrating your monorepo multiverse...');
    core.info('');
    core.info('🚀 Starting VERSE engine...');
    core.info(`Repository: ${repoRoot}`);
    core.info(`Adapter: ${adapter}`);
    core.info(`Config: ${configPath}`);
    core.info(`Release branches: ${releaseBranches.join(', ')}`);
    core.info(`Dry run: ${dryRun}`);
    core.info(`Prerelease mode: ${prereleaseMode}`);
    if (prereleaseMode) {
      core.info(`Prerelease ID: ${prereleaseId}`);
      core.info(`Bump unchanged modules: ${bumpUnchanged}`);
    }
    core.info(`Add build metadata: ${addBuildMetadata}`);
    core.info(`Timestamp versions: ${timestampVersions}`);
    core.info(`Gradle snapshot: ${gradleSnapshot}`);
    core.info(`Push changes: ${pushChanges}`);

    // Create runner options
    const options: RunnerOptions = {
      repoRoot,
      adapter,
      configPath,
      releaseBranches,
      dryRun,
      createReleases,
      pushTags,
      fetchDepth,
      prereleaseMode,
      prereleaseId,
      bumpUnchanged,
      addBuildMetadata,
      timestampVersions,
      gradleSnapshot,
      pushChanges,
    };

    // Run VERSE engine
    const runner = new VerseRunner(options);
    const result = await runner.run();

    // Set outputs
    core.setOutput('bumped', result.bumped.toString());
    core.setOutput('changed-modules', JSON.stringify(result.changedModules));
    core.setOutput('created-tags', result.createdTags.join(','));
    core.setOutput('changelog-paths', result.changelogPaths.join(','));
    
    if (result.manifestPath) {
      core.setOutput('manifest-path', result.manifestPath);
    }

    // Log results
    if (result.bumped) {
      core.info(`✅ Successfully updated ${result.changedModules.length} modules`);
      for (const module of result.changedModules) {
        core.info(`  ${module.id}: ${module.from} → ${module.to} (${module.bumpType})`);
      }
      
      if (result.createdTags.length > 0) {
        core.info(`🏷️  Created ${result.createdTags.length} tags: ${result.createdTags.join(', ')}`);
      }
      
      if (result.changelogPaths.length > 0) {
        core.info(`📚 Generated ${result.changelogPaths.length} changelog files`);
      }
    } else {
      core.info('✨ No version changes needed');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`❌ Action failed: ${errorMessage}`);
    
    if (error instanceof Error && error.stack) {
      core.debug(`Stack trace: ${error.stack}`);
    }
  }
}

/**
 * Handle GitHub Releases creation (if enabled)
 */
async function createGitHubReleases(
  changedModules: Array<{ name: string; from: string; to: string }>,
  changelogPaths: string[]
): Promise<void> {
  // Implementation would use @actions/github to create releases
  // This is a placeholder for the actual implementation
  core.info('📦 GitHub Releases creation not yet implemented');
}

// Auto-run if this is the main module
if (require.main === module) {
  run();
}