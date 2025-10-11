# VERSE - Version Engine for Repo Semantic Evolution

**VERSE** orchestrates the multiverse of your monorepo, where each module exists as an independent universe with its own semantic evolution timeline. Like cosmic events rippling through space-time, changes in one module intelligently cascade through dependency relationships, ensuring your entire codebase multiverse remains harmoniously synchronized.

This powerful TypeScript GitHub Action harnesses Conventional Commits to automatically evolve semantic versions across your project multiverse, maintaining perfect dimensional stability while allowing each module universe to grow at its own pace.

## Key Features

✅ **Conventional Commits Parsing** - Automatically determines version bumps based on commit messages  
✅ **Multi-Module Support** - Each module can be versioned independently  
✅ **Dependency Cascade** - When a dependency changes, dependents are automatically bumped  
✅ **Gradle Adapter** - First-class support for Gradle (Groovy & Kotlin DSL)  
✅ **Extensible Architecture** - Easy to add adapters for other ecosystems  
✅ **Changelog Generation** - Automatic per-module changelog generation  
✅ **GitHub Integration** - Creates tags and releases automatically  
✅ **Pre-release Support** - Generate alpha, beta, rc, or custom pre-release versions

## Usage

Add this action to your workflow:

```yaml
name: Release
on:
  push:
    branches: [ "main" ]

jobs:
  version-and-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: VERSE Semantic Evolution
        id: versioner
        uses: your-org/verse@v1
        with:
          adapter: gradle
          create-releases: true
          dry-run: false
      - name: Print results
        run: |
          echo "Bumped: ${{ steps.versioner.outputs.bumped }}"
          echo "Changed: ${{ steps.versioner.outputs['changed-modules'] }}"
```

### Pre-release Versions

For development builds or pre-release versions:

```yaml
name: Development Build
on:
  push:
    branches: [ "develop" ]

jobs:
  prerelease-version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Create pre-release versions
        uses: your-org/verse@v1
        with:
          adapter: gradle
          prerelease-mode: true
          prerelease-id: alpha
          bump-unchanged: true
```

### Timestamp-based Versions

For time-based unique versions (useful for CI/CD pipelines):

```yaml
name: CI Build
on:
  pull_request:
  push:
    branches: [ "feature/*", "develop" ]

jobs:
  ci-version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Create timestamp versions
        uses: your-org/verse@v1
        with:
          adapter: gradle
          prerelease-mode: true
          prerelease-id: alpha
          timestamp-versions: true
          bump-unchanged: true
          add-build-metadata: true
```

This generates versions like: `1.2.3-alpha.20251008.1530+abc1234` where:
- `alpha.20251008.1530` is the timestamp-based prerelease identifier (YYYYMMDD.HHMM format)
- `abc1234` is the short SHA build metadata

### Gradle SNAPSHOT Versions

For Gradle projects using the conventional `-SNAPSHOT` suffix:

```yaml
name: Development Build
on:
  push:
    branches: [ "develop" ]

jobs:
  gradle-snapshot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Create Gradle SNAPSHOT versions
        uses: your-org/verse@v1
        with:
          adapter: gradle
          gradle-snapshot: true
```

This applies `-SNAPSHOT` suffix to **all** module versions, generating versions like: `1.2.3-SNAPSHOT`, `2.1.0-SNAPSHOT`

## Action Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `release-branches` | Comma-separated release branches | `main,master` |
| `dry-run` | Run without making changes | `false` |
| `fetch-depth` | Git history depth (0 = full) | `0` |
| `adapter` | Language adapter to use | `gradle` |
| `config-path` | Path to config file | `.versioningrc.json` |
| `create-releases` | Create GitHub Releases | `false` |
| `push-tags` | Push tags to remote | `true` |
| `prerelease-mode` | Generate pre-release versions | `false` |
| `prerelease-id` | Pre-release identifier | `alpha` |
| `bump-unchanged` | Bump modules with no changes in prerelease mode | `false` |
| `add-build-metadata` | Add build metadata with short SHA to all versions | `false` |
| `timestamp-versions` | Use timestamp-based prerelease identifiers (e.g., alpha.20251008.1530) | `false` |
| `gradle-snapshot` | Add -SNAPSHOT suffix to all Gradle versions (Gradle convention) | `false` |
| `push-changes` | Commit and push version changes and changelogs to remote | `true` |

> 📖 **Detailed Pre-release Documentation**: See [PRERELEASE.md](PRERELEASE.md) for comprehensive examples and use cases.

## Git Operations

The action automatically handles git operations as part of the versioning workflow:

### Automatic Commit and Push

By default (`push-changes: true`), the action will:
1. **Generate** version updates and changelogs
2. **Commit** all changed files with message: `"chore: update versions and changelogs"`  
3. **Push** changes to the remote repository
4. **Create and push** version tags (if `push-tags: true`)

### Disabling Git Operations

For workflows where you want to handle git operations manually:

```yaml
- name: Version modules (no git operations)
  uses: your-org/verse@v1
  with:
    adapter: gradle
    push-changes: false    # Disable automatic commit/push
    push-tags: false       # Disable automatic tag pushing
```

This is useful when:
- **Running in forks** or environments without write permissions
- **Custom commit workflows** that require specific commit messages or signing
- **Multi-step pipelines** where versioning is separated from publishing
- **Testing and validation** before committing changes

### Git Configuration Requirements

For git operations to work, ensure your workflow has:

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0        # Full history for version calculation
      token: ${{ secrets.GITHUB_TOKEN }}  # Or personal access token
  - name: Configure Git
    run: |
      git config --global user.name "github-actions[bot]"
      git config --global user.email "github-actions[bot]@users.noreply.github.com"
```

## Action Outputs

| Output | Description |
|--------|-------------|
| `bumped` | Whether any module was bumped |
| `changed-modules` | JSON array of changed modules |
| `created-tags` | Comma-separated list of created tags |
| `changelog-paths` | Comma-separated changelog file paths |
| `manifest-path` | Path to version manifest file |

## Configuration

Create `.versioningrc.json` in your repository root:

```json
{
  "defaultBump": "patch",
  "commitTypes": {
    "feat": "minor",
    "fix": "patch",
    "perf": "patch",
    "refactor": "patch",
    "docs": "ignore",
    "test": "ignore",
    "chore": "ignore"
  },
  "dependencyRules": {
    "onMajorOfDependency": "minor",
    "onMinorOfDependency": "patch",
    "onPatchOfDependency": "noop"
  },
  "gradle": {
    "versionSource": ["version-catalog", "gradle.properties", "build.gradle.kts"],
    "updateVersionCatalog": true,
    "versionCatalogPath": "gradle/libs.versions.toml"
  }
}
```

## Gradle Project Structure

The Gradle adapter supports:

- **Multi-module projects** via `settings.gradle(.kts)`
- **Version sources**: Version catalogs (`libs.versions.toml`), `gradle.properties`, `build.gradle(.kts)`
- **Version catalogs**: Full support for Gradle's centralized dependency management
- **Dependency detection**: `implementation(project(":module"))`, `implementation(libs.mylib)`
- **Both DSLs**: Groovy and Kotlin DSL

Example structure:
```
myproject/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties      # version=1.0.0
├── gradle/
│   └── libs.versions.toml # [versions] core = "2.1.0"
├── core/
│   └── build.gradle.kts   # version = libs.versions.core
└── api/
    ├── build.gradle.kts
    └── gradle.properties   # version=2.1.0
```

### Version Catalog Support

The action has **first-class support for Gradle Version Catalogs**:

```toml
# gradle/libs.versions.toml
[versions]
project = "1.0.0"
core = "2.1.0"
api = "1.5.0"

[libraries]
spring-boot = { group = "org.springframework.boot", name = "spring-boot-starter", version.ref = "spring" }
junit = "org.junit.jupiter:junit-jupiter:5.9.2"

[bundles]
testing = ["junit", "mockito"]
```

**Features:**
- ✅ **Version management**: Updates versions in `[versions]` section
- ✅ **Dependency parsing**: Resolves `libs.mylib` references  
- ✅ **Variable resolution**: Handles `version.ref` references
- ✅ **Priority handling**: Version catalog takes precedence over other sources

## Commit Message Format

Use [Conventional Commits](https://conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Examples:
- `feat(api): add new endpoint` → **minor** bump
- `fix(core): resolve memory leak` → **patch** bump  
- `feat!: breaking API change` → **major** bump

## Development

### Setup
```bash
npm install
npm run build
npm test
```

### Building
```bash
npm run package  # Creates dist/index.js for GitHub Actions
```

### Testing
```bash
npm test              # Run all tests
npm run test:coverage # Run with coverage
```

## Architecture

- **`src/adapters/`** - Language-specific adapters (Gradle, future: Node, Python)
- **`src/semver/`** - Semantic version utilities
- **`src/git/`** - Git operations and commit parsing
- **`src/graph/`** - Dependency graph and cascade logic
- **`src/config/`** - Configuration loading and validation
- **`src/changelog/`** - Changelog generation
- **`src/runner.ts`** - Main orchestration logic
- **`src/io/`** - GitHub Action input/output handling

## Extending

Add new language adapters by implementing the `LanguageAdapter` interface:

```typescript
class MyAdapter extends BaseAdapter {
  async detectModules(repoRoot: string): Promise<Module[]> { /* ... */ }
  async readVersion(module: Module): Promise<SemVer> { /* ... */ }
  async writeVersion(module: Module, version: SemVer): Promise<void> { /* ... */ }
  async getDependencies(module: Module): Promise<DependencyRef[]> { /* ... */ }
  getName(): string { return 'my-adapter'; }
}
```

## License

MIT License - see [LICENSE](LICENSE) for details.