const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Include root node_modules in watch scope so hoisted packages are bundled
config.watchFolders = [monorepoRoot];

// Resolve order: app first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force ALL react imports to app's React 19 copy.
// Without this, hoisted packages (react-native, expo-router) resolve the root React copy from the
// admin workspace, creating two React instances → "Cannot read property 'useRef' of null".
// By spoofing originModulePath to a file inside apps/mobile, Metro walks up from here and
// finds apps/mobile/node_modules/react (19.3.0, required by RN 0.88) before reaching root
// node_modules/react (19.1.0, pinned by the admin app).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'package.json') },
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
