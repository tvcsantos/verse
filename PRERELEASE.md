# Pre-release Version Support

This action now supports generating pre-release versions instead of final release versions. This is particularly useful for CI/CD pipelines that need to create development or testing versions.

## New Input Parameters

### `prerelease-mode`
- **Description**: Generate pre-release versions instead of final versions
- **Required**: false
- **Default**: `'false'`
- **Example**: `'true'`

When enabled, all version bumps will generate pre-release versions using the specified identifier.

### `prerelease-id`
- **Description**: Pre-release identifier (e.g., alpha, beta, rc)
- **Required**: false
- **Default**: `'alpha'`
- **Example**: `'alpha'`, `'beta'`, `'rc'`, `'dev'`

This identifier will be appended to versions in pre-release mode.

### `bump-unchanged`
- **Description**: In prerelease mode, bump modules even when no changes are detected
- **Required**: false
- **Default**: `'false'`
- **Example**: `'true'`

When enabled in pre-release mode, modules will be bumped to pre-release versions even if no commits require a version bump.

### `add-build-metadata`
- **Description**: Add build metadata with short SHA to all versions
- **Required**: false
- **Default**: `'false'`
- **Example**: `'true'`

When enabled, appends build metadata in the format `+<short-sha>` to all version numbers. This forces all modules to be updated even if no code changes are detected.

### `timestamp-versions`
- **Description**: Use timestamp-based prerelease identifiers
- **Required**: false
- **Default**: `'false'`
- **Example**: `'true'`

When enabled with `prerelease-mode`, generates timestamp-based prerelease identifiers in the format `{prerelease-id}.YYYYMMDD.HHMM` (UTC time). This provides unique, time-ordered versions for every build.

### `gradle-snapshot`
- **Description**: Add -SNAPSHOT suffix to all Gradle versions
- **Required**: false
- **Default**: `'false'`
- **Example**: `'true'`

When enabled for Gradle projects, appends `-SNAPSHOT` suffix to **all** module versions, following Gradle convention. This is different from prerelease mode - it applies to every module regardless of changes.

## Usage Examples

### Basic Pre-release Mode
```yaml
- uses: your-org/verse@v1
  with:
    prerelease-mode: 'true'
    prerelease-id: 'alpha'
```

**Result**: `1.2.3` → `1.2.4-alpha.0` (for patch changes)

### Development Builds with Unchanged Modules
```yaml
- uses: your-org/verse@v1
  with:
    prerelease-mode: 'true'
    prerelease-id: 'dev'
    bump-unchanged: 'true'
```

**Result**: Even modules without changes will get new pre-release versions

### Build Metadata with Short SHA
```yaml
- uses: your-org/verse@v1
  with:
    add-build-metadata: 'true'
```

**Result**: `1.2.3` → `1.2.3+a7b8c9d` (adds short SHA to all versions)

### Alpha/Beta Releases
```yaml
- uses: your-org/verse@v1
  with:
    prerelease-mode: 'true'
    prerelease-id: 'alpha'
```

**Result**: `1.2.3` → `1.3.0-alpha.0` (for minor changes)

### Timestamp-based Versions
```yaml
- uses: your-org/verse@v1
  with:
    prerelease-mode: 'true'
    prerelease-id: 'alpha'
    timestamp-versions: 'true'
    bump-unchanged: 'true'
```

**Result**: `1.2.3` → `1.3.0-alpha.20251008.1530` (timestamp format: YYYYMMDD.HHMM)

### Complete CI/CD Pipeline Example
```yaml
- uses: your-org/verse@v1
  with:
    prerelease-mode: 'true'
    prerelease-id: 'ci'
    timestamp-versions: 'true'
    bump-unchanged: 'true'
    add-build-metadata: 'true'
```

**Result**: `1.2.3` → `1.3.0-ci.20251008.1530+a7b8c9d` (timestamp + build metadata)

## Version Bump Behavior

### Regular Mode (prerelease-mode: false)
- `1.2.3` + patch changes → `1.2.4`
- `1.2.3` + minor changes → `1.3.0`
- `1.2.3` + major changes → `2.0.0`
- `1.2.3` + no changes → no version bump

### Pre-release Mode (prerelease-mode: true)
- `1.2.3` + patch changes → `1.2.4-alpha.0`
- `1.2.3` + minor changes → `1.3.0-alpha.0`
- `1.2.3` + major changes → `2.0.0-alpha.0`
- `1.2.3` + no changes → no version bump (unless `bump-unchanged: true`)

### Pre-release Mode with Bump Unchanged
- `1.2.3` + no changes → `1.2.4-alpha.0` (increments patch)
- `1.2.3-alpha.0` + no changes → `1.2.3-alpha.1` (increments pre-release number)

### Build Metadata Mode
- `1.2.3` + no changes → `1.2.3+a7b8c9d` (adds short SHA)

### Timestamp-based Pre-release Mode
- `1.2.3` + patch changes → `1.2.4-alpha.20251008.1530`
- `1.2.3` + minor changes → `1.3.0-alpha.20251008.1530`
- `1.2.3` + major changes → `2.0.0-alpha.20251008.1530`
- `1.2.3` + no changes → `1.2.4-alpha.20251008.1530` (when `bump-unchanged: true`)

The timestamp format `YYYYMMDD.HHMM` uses UTC time to ensure consistency across different timezones and provides natural ordering by creation time.
- `1.2.3-alpha.0` + no changes → `1.2.3-alpha.0+a7b8c9d` (adds short SHA to pre-release)
- Works with any version type and forces all modules to update

## Use Cases

### 1. CI/CD Development Builds
Create pre-release versions for every commit to development branches:
```yaml
if: github.ref == 'refs/heads/develop'
uses: your-org/verse@v1
with:
  prerelease-mode: 'true'
  prerelease-id: 'alpha'
  bump-unchanged: 'true'
```

### 2. Feature Branch Testing
Generate alpha versions for feature branches:
```yaml
if: startsWith(github.ref, 'refs/heads/feature/')
uses: your-org/verse@v1
with:
  prerelease-mode: 'true'
  prerelease-id: 'alpha'
```

### 3. Release Candidate Pipeline
Create release candidates before final releases:
```yaml
if: github.ref == 'refs/heads/release'
uses: your-org/verse@v1
with:
  prerelease-mode: 'true'
  prerelease-id: 'rc'
```

### 4. Development Builds
Perfect for continuous integration and development builds:
```yaml
uses: your-org/verse@v1
with:
  adapter: 'gradle'
  prerelease-mode: 'true'
  prerelease-id: 'dev'
  bump-unchanged: 'true'
```

### 5. Build Metadata for Unique Versions
Create unique versions for every commit using build metadata:
```yaml
uses: your-org/verse@v1
with:
  add-build-metadata: 'true'
```

### 6. Combined Mode: Pre-release + Build Metadata
Get the best of both worlds:
```yaml
uses: your-org/verse@v1
with:
  prerelease-mode: 'true'
  prerelease-id: 'alpha'
  add-build-metadata: 'true'
  bump-unchanged: 'true'
```
**Result**: `1.2.4-alpha.0+a7b8c9d`

### 7. Gradle SNAPSHOT Versions
Apply Gradle's conventional `-SNAPSHOT` suffix to all modules:
```yaml
uses: your-org/verse@v1
with:
  gradle-snapshot: 'true'
```
**Result**: All modules get `-SNAPSHOT` suffix: `1.2.3-SNAPSHOT`, `2.1.0-SNAPSHOT`

**Note**: This applies to ALL modules in the project, not just changed ones.

## Git Operations in Pre-release Workflows

### Controlling Git Operations

The `push-changes` input parameter controls whether the action commits and pushes changes:

```yaml
# Enable git operations (default)
uses: your-org/verse@v1
with:
  prerelease-mode: 'true'
  push-changes: 'true'      # Commits and pushes version changes

# Disable git operations  
uses: your-org/verse@v1
with:
  prerelease-mode: 'true'
  push-changes: 'false'     # No commits/pushes, just updates files
```

### Common Pre-release Git Workflows

#### 1. Development Branch Auto-versioning
Automatically commit pre-release versions on development branches:
```yaml
name: Dev Versioning
on:
  push:
    branches: [develop]
jobs:
  version:
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0
      - name: Pre-release version
        uses: your-org/verse@v1
        with:
          prerelease-mode: 'true'
          prerelease-id: 'alpha'
          timestamp-versions: 'true'
          push-changes: 'true'        # Auto-commit changes
```

#### 2. Pull Request Validation (No Commits)
Test versioning in PRs without making changes:
```yaml
name: PR Validation
on: 
  pull_request:
jobs:
  validate:
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Validate versions
        uses: your-org/verse@v1
        with:
          prerelease-mode: 'true'
          dry-run: 'true'             # Don't make changes
          push-changes: 'false'       # No git operations
```

#### 3. Manual Release Preparation
Generate versions without auto-committing for review:
```yaml
name: Prepare Release
on: 
  workflow_dispatch:
jobs:
  prepare:
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Generate release versions
        uses: your-org/verse@v1
        with:
          prerelease-mode: 'true'
          prerelease-id: 'rc'
          push-changes: 'false'       # Manual commit control
      - name: Create PR with changes
        # Custom logic to create PR with generated changes
```

## Notes

- Pre-release versions follow semantic versioning standards
- Cascade effects (dependency bumps) also respect pre-release mode
- Tags created will include the pre-release identifier
- The feature works with all supported adapters (Gradle, Maven, etc.)
- Pre-release versions are automatically sorted correctly by semantic versioning rules
- Git operations respect the `push-changes` setting for flexible workflow integration