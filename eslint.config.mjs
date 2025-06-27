import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigGoogle from 'eslint-config-google';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigGoogle, // Thêm preset Google
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          legacyDecorators: true,
        },
        project: './tsconfig.json',
      },
    },
    rules: {
      // Override các rule Google nếu cần
      'new-cap': 'off',
      'linebreak-style': 'off',
      'object-curly-spacing': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'max-len': ['error', { code: 120 }],
      // Thêm rule TypeScript nếu muốn
      // '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
