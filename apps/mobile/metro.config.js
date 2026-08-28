// `apps/mobile` is deliberately not a root workspace member (see
// scripts/check-mobile.sh), so Metro needs explicit monorepo wiring.
//
// `@hydrocycle/contracts` is resolved as a source alias rather than as an
// installed dependency. Bun *copies* `file:` dependencies, so a regenerated
// contract would silently serve stale types here, and Bun's `link:` means a
// globally-linked package rather than a relative symlink. Aliasing the source
// directory keeps one live copy that Vite, Vitest, Metro, and Jest all agree
// on. The matching mapping lives in tsconfig.json `paths`.

const path = require("node:path");

const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const contractsSource = path.resolve(monorepoRoot, "packages/contracts/src");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@hydrocycle/contracts": contractsSource,
};

module.exports = config;
