module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // NOTE: babel-plugin-react-compiler removed — experimental plugin causes
      // runtime crashes in production APK builds (undefined is not a function).
      'expo-router/babel',
      // react-native-reanimated/plugin MUST be last — required for Reanimated 3.x
      // to work on native (Android/iOS). Missing this causes a crash on launch.
      'react-native-reanimated/plugin',
    ],
  };
};
