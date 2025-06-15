import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigGoogle from 'eslint-config-google';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          legacyDecorators: true, // Cho phép decorator kiểu legacy (NestJS)
        },
        project: './tsconfig.json',
      },
    },
    rules: {
      ...eslintConfigGoogle.rules,
      'linebreak-style': ['error', 'unix'],
      'object-curly-spacing': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'max-len': ['error', { code: 120 }],
      // Có thể thêm các rule khác nếu cần
    },
  },
];
