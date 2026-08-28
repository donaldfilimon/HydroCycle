// `apps/mobile` is deliberately not a root workspace member (see
// scripts/check-mobile.sh), so Metro needs explicit monorepo wiring.
//
// Shared packages are resolved as source aliases rather than as installed
// installed dependency. Bun *copies* `file:` dependencies, so a regenerated
// contract would silently serve stale types here, and Bun's `link:` means a
// globally-linked package rather than a relative symlink. Aliasing the source
// directory keeps one live copy that Vite, Vitest, Metro, and Jest all agree
// on. The matching mapping lives in tsconfig.json `paths`.

const path = require("node:path");

const { getDefaultConfig } = require("expo/metro-config");
const {
  installLoopbackListenerGuard,
} = require("./scripts/loopback-listener-guard.cjs");

// `expo start --localhost` controls the URL it advertises, but Expo SDK 53
// still calls `listen(port, undefined)` and therefore opens Metro on every
// interface. Guard the actual Node listener as well as the displayed URL.
installLoopbackListenerGuard();

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const contractsSource = path.resolve(monorepoRoot, "packages/contracts/src");
const viewModelSource = path.resolve(monorepoRoot, "packages/view-model/src");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@hydrocycle/contracts": contractsSource,
  "@hydrocycle/view-model": viewModelSource,
};

module.exports = config;
