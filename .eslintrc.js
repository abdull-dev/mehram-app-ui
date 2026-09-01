module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // The web target. These files render DOM nodes, where a plain style
      // object is the API rather than something StyleSheet.create should own,
      // and there is no native module to lint against.
      files: ['web/**/*.{ts,tsx}', 'src/**/*.web.{ts,tsx}'],
      rules: {
        'react-native/no-inline-styles': 'off',
      },
    },
  ],
};
