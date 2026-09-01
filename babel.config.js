module.exports = {
  presets: ['module:@react-native/babel-preset'],

  env: {
    test: {
      /**
       * The city dataset is reached through `import()` so that neither Metro nor
       * Vite loads 8MB before a screen needs it. Jest runs the code as
       * CommonJS, where a native dynamic import throws
       * ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG; this rewrites it to a
       * require for tests only, leaving the real lazy load in the app bundles.
       */
      plugins: ['@babel/plugin-transform-dynamic-import'],
    },
  },
};
