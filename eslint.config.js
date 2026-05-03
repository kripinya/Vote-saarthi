module.exports = [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        browser: true,
        node: true,
        jest: true
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'off'
    }
  }
];
