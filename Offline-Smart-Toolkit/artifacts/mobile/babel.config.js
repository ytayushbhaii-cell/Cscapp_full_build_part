module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-react-compiler',
      'expo-router/babel',
      // react-native-reanimated/plugin MUST be last — required for Reanimated 4.x
      // to work on native (Android/iOS). Missing this causes a crash on launch.
      'react-native-reanimated/plugin',
    ],
  };
};
