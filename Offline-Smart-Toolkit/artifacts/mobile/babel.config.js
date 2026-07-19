module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated/plugin MUST be last.
      // Required for Reanimated 3.x to work on native (Android/iOS).
      'react-native-reanimated/plugin',
    ],
  };
};
