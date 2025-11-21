module.exports = function(api) {
  api.cache(true); // Indica a Babel que puede usar la caché

  return {
    presets: [
      // Conjunto de plugins predefinidos para Expo/React Native
      'babel-preset-expo' 
    ],
    plugins: [
      'react-native-reanimated/plugin', 
    ],
  };
};