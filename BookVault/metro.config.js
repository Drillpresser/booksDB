const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Intercept react-native-reanimated and replace with a no-op stub.
// Reanimated's NativeWorklets native module crashes on iOS 26 with Expo Go 54.
// The stub provides the same JS API surface with inert implementations so
// expo-router's tab animations don't error, but no native worklets are called.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'react-native-reanimated' ||
    moduleName.startsWith('react-native-reanimated/')
  ) {
    return {
      filePath: path.resolve(__dirname, 'reanimated-stub/index.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
