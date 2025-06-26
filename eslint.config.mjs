import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigGoogle from 'eslint-config-google';

// Loại bỏ các rule không còn tồn tại ở ESLint 9+ (valid-jsdoc, require-jsdoc)
const googleRules = { ...eslintConfigGoogle.rules };
delete googleRules['valid-jsdoc'];
delete googleRules['require-jsdoc'];

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
      ...googleRules,
      'new-cap': 'off',
      'linebreak-style': ['error', 'unix'],
      'object-curly-spacing': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'max-len': ['error', { code: 120 }],
      // '@typescript-eslint/no-explicit-any': 'off',
      // Có thể thêm các rule khác nếu cần
    },
  },
];
