module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "@babel/plugin-transform-class-properties",
      "@babel/plugin-transform-nullish-coalescing-operator",
      "@babel/plugin-transform-optional-chaining",
      "react-native-reanimated/plugin",
    ],
  };
};
