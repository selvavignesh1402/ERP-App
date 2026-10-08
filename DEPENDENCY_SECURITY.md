# Dependency security

The dependency-security workflow performs an OSV scan on pushes and pull requests. It fails when known vulnerabilities are found; it does not suppress the current backlog. Dependabot separately proposes npm and GitHub Actions updates. Workflow definitions are local until committed and pushed; a successful local unit suite is not evidence that the hosted scanner has passed.

The October 4, 2026 npm audit reported 67 advisories across the dependency tree. Compatible updates reduced that run to 51 (14 moderate, 36 high, one critical). These are advisory counts, not a claim that every package is exploitable in the deployed app. A fresh audit is required for release; subsequent installations may change the graph.

Several remaining fixes require upgrading the Expo/React Native stack. Do not use audit fix --force as a substitute for an SDK migration: update Expo, React Native, native modules, and router together, then verify Android/iOS and the web export. The current SDK remains 52. The installed Expo Router 4 imports query-string without declaring it directly, so the app now declares its compatible 7.x dependency explicitly.

Run npm audit to obtain current findings. Run npm run check, npm run format:check, and an Expo web export after dependency changes. Native device acceptance is also required for camera, storage, navigation, and printing.

Scanner configuration follows the [OSV GitHub Action documentation](https://google.github.io/osv-scanner/github-action/). It scans the resolved package lock. The companion backend scan resolves Maven dependencies; its documented resolver does not include test dependencies.
