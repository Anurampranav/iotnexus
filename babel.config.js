module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@design': './src/design',
            '@components': './src/components',
            '@store': './src/store',
            '@models': './src/models',
            '@services': './src/services',
            '@data': './src/data',
            '@hooks': './src/hooks',
            '@utils': './src/utils',
            '@native': './src/native',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
