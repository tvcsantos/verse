# GitHub Action: Monorepo Version Manager

## Goal
Create a **TypeScript GitHub Action** that manages **semantic versions** for projects in a monorepo based on **Conventional Commits** history. It must be **extensible** to multiple languages/frameworks over time, with an initial **first-class adapter for JVM (Gradle)**. Focus on **independent versioning per module** and **dependency-aware cascading bumps** (if `A` changes and `B` depends on `A`, then `B` must also receive a bump).

---

## Features Summary

- ✅ Parse **Conventional Commits** and map them to SemVer bumps  
- ✅ Support **multi-module independent versioning**  
- ✅ Propagate version changes to **dependent modules**  
- ✅ Provide **Gradle (JVM) adapter** with support for Groovy & Kotlin DSL  
- ✅ Extensible **adapter interface** for future ecosystems (Node, Python, Rust, etc.)  
- ✅ Generate **per-module changelogs** and GitHub Releases  
- ✅ Expose **action inputs/outputs** for workflow automation

---

## Architecture Overview

### Adapter Interface

```ts
interface LanguageAdapter {
  detectModules(repoRoot: string): Promise<Module[]>;
  readVersion(module: Module): Promise<SemVer>;
  writeVersion(module: Module, newVersion: SemVer): Promise<void>;
  getDependencies(module: Module): Promise<DependencyRef[]>;
  updateDependentConstraints?(module: Module, dep: DependencyRef, newVersion: SemVer): Promise<void>;
}
```

- `GradleAdapter` is the first implementation.
- Future adapters: `NodeAdapter`, `PythonAdapter`, etc.

---

## Gradle Adapter Details

**Module Detection**
- Parse `settings.gradle(.kts)` for `include(":module")` and `includeBuild`.
- Each included project = module.

**Version Source**
- Prefer per-module `gradle.properties`.
- Fallback to `build.gradle(.kts)`.

**Dependency Graph**
- Parse `dependencies { implementation(project(":foo")) }` and equivalents.

**Version Write-Back**
- Update only changed modules’ `gradle.properties` or `build.gradle(.kts)` files.

---

## GitHub Action Inputs / Outputs

### Inputs

| Name | Description | Default |
|------|--------------|----------|
| `release-branches` | Comma-separated list of release branches | `main,master` |
| `dry-run` | Run without writing or pushing | `false` |
| `adapter` | Language adapter (e.g., `gradle`) | `gradle` |
| `config-path` | Optional path to specific config file (auto-discovery used if not provided) | `` |
| `create-releases` | Create GitHub Releases | `false` |
| `push-tags` | Push tags to origin | `true` |

### Outputs

| Name | Description |
|------|--------------|
| `bumped` | Whether any module was bumped |
| `changed-modules` | JSON array of `{ name, from, to }` |
| `created-tags` | List of created tags |
| `changelog-paths` | Generated changelog files |
| `manifest-path` | Manifest with current versions |

---

## Configuration Example (`.verserc.json`)

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
    "versionSource": ["gradle.properties", "build.gradle.kts"],
    "updateVersionCatalog": false
  }
}
```

---

## Example Workflow

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
      - uses: actions/setup-node@v4
        with:
          node-version: 20
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

---

## Directory Layout

```
action/
├─ src/
│  ├─ adapters/
│  │  ├─ core.ts
│  │  └─ gradle/
│  │     ├─ gradleAdapter.ts
│  │     ├─ parsers/
│  │     │  ├─ settings.ts
│  │     │  ├─ buildGradleKts.ts
│  │     │  └─ buildGradleGroovy.ts
│  ├─ git/
│  ├─ semver/
│  ├─ graph/
│  ├─ changelog/
│  ├─ config/
│  ├─ runner.ts
│  └─ io/
├─ test/
├─ action.yml
├─ package.json
├─ tsconfig.json
├─ README.md
└─ LICENSE
```

---

## Acceptance Criteria

- Parses Conventional Commits per module.
- Computes correct **SemVer bump**.
- Detects Gradle modules and dependencies.
- Cascades bumps properly.
- Writes versions back cleanly.
- Creates module tags (`module@vX.Y.Z`).
- Supports changelogs and GitHub Releases.
- Extensible via adapter model.
- Packaged via `@vercel/ncc`.
- Tested with **Vitest** on sample repos.

---

## License
MIT
