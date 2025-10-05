# Monorepo Version Manager - GitHub Action

This TypeScript GitHub Action manages semantic versions for projects in a monorepo based on Conventional Commits history. It features independent versioning per module and dependency-aware cascading bumps.

## Key Features

✅ **Conventional Commits Parsing** - Automatically determines version bumps based on commit messages  
✅ **Multi-Module Support** - Each module can be versioned independently  
✅ **Dependency Cascade** - When a dependency changes, dependents are automatically bumped  
✅ **Gradle Adapter** - First-class support for Gradle (Groovy & Kotlin DSL)  
✅ **Extensible Architecture** - Easy to add adapters for other ecosystems  
✅ **Changelog Generation** - Automatic per-module changelog generation  
✅ **GitHub Integration** - Creates tags and releases automatically

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
      - name: Version modules
        id: versioner
        uses: your-org/monorepo-versioner@v1
        with:
          adapter: gradle
          create-releases: true
          dry-run: false
      - name: Print results
        run: |
          echo "Bumped: ${{ steps.versioner.outputs.bumped }}"
          echo "Changed: ${{ steps.versioner.outputs['changed-modules'] }}"
```

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
    "onPatchOfDependency": "noop",
    "strictCompatibility": false
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