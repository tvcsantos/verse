# Pre-release and Snapshot Version Support

This action now supports generating pre-release/snapshot versions instead of final release versions. This is particularly useful for CI/CD pipelines that need to create development or testing versions.

## New Input Parameters

### `prerelease-mode`
- **Description**: Generate pre-release versions instead of final versions
- **Required**: false
- **Default**: `'false'`
- **Example**: `'true'`

When enabled, all version bumps will generate pre-release versions using the specified identifier.

### `prerelease-id`
- **Description**: Pre-release identifier (e.g., alpha, beta, SNAPSHOT)
- **Required**: false
- **Default**: `'SNAPSHOT'`
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

## Usage Examples

### Basic Pre-release Mode
```yaml
- uses: your-org/verse@v1
  with:
    prerelease-mode: 'true'
    prerelease-id: 'SNAPSHOT'
```

**Result**: `1.2.3` → `1.2.4-SNAPSHOT.0` (for patch changes)

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

## Version Bump Behavior

### Regular Mode (prerelease-mode: false)
- `1.2.3` + patch changes → `1.2.4`
- `1.2.3` + minor changes → `1.3.0`
- `1.2.3` + major changes → `2.0.0`
- `1.2.3` + no changes → no version bump

### Pre-release Mode (prerelease-mode: true)
- `1.2.3` + patch changes → `1.2.4-SNAPSHOT.0`
- `1.2.3` + minor changes → `1.3.0-SNAPSHOT.0`
- `1.2.3` + major changes → `2.0.0-SNAPSHOT.0`
- `1.2.3` + no changes → no version bump (unless `bump-unchanged: true`)

### Pre-release Mode with Bump Unchanged
- `1.2.3` + no changes → `1.2.4-SNAPSHOT.0` (increments patch)
- `1.2.3-SNAPSHOT.0` + no changes → `1.2.3-SNAPSHOT.1` (increments pre-release number)

### Build Metadata Mode
- `1.2.3` + no changes → `1.2.3+a7b8c9d` (adds short SHA)
- `1.2.3-SNAPSHOT.0` + no changes → `1.2.3-SNAPSHOT.0+a7b8c9d` (adds short SHA to pre-release)
- Works with any version type and forces all modules to update

## Use Cases

### 1. CI/CD Development Builds
Create snapshot versions for every commit to development branches:
```yaml
if: github.ref == 'refs/heads/develop'
uses: your-org/verse@v1
with:
  prerelease-mode: 'true'
  prerelease-id: 'SNAPSHOT'
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

### 4. Maven SNAPSHOT Versions
Perfect for Java projects that use Maven SNAPSHOT conventions:
```yaml
uses: your-org/verse@v1
with:
  adapter: 'gradle'
  prerelease-mode: 'true'
  prerelease-id: 'SNAPSHOT'
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
  prerelease-id: 'SNAPSHOT'
  add-build-metadata: 'true'
  bump-unchanged: 'true'
```
**Result**: `1.2.4-SNAPSHOT.0+a7b8c9d`

## Notes

- Pre-release versions follow semantic versioning standards
- Cascade effects (dependency bumps) also respect pre-release mode
- Tags created will include the pre-release identifier
- The feature works with all supported adapters (Gradle, Maven, etc.)
- Pre-release versions are automatically sorted correctly by semantic versioning rules