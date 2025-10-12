// VERSE configuration in JavaScript format
module.exports = {
  defaultBump: 'patch',
  commitTypes: {
    feat: 'minor',
    fix: 'patch',
    perf: 'patch',
    refactor: 'patch',
    docs: 'ignore',
    test: 'ignore',
    chore: 'ignore',
    style: 'ignore',
    ci: 'ignore',
    build: 'ignore',
    breaking: 'major'
  },
  dependencyRules: {
    onMajorOfDependency: 'minor',
    onMinorOfDependency: 'patch',
    onPatchOfDependency: 'none'
  },
  gradle: {
    versionSource: ['gradle.properties']
  },
  nodejs: {
    versionSource: ['package.json'],
    updatePackageLock: true
  }
};