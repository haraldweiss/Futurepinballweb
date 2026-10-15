// Security checks use ESLint's flat configuration (ESLint 10+).
import parser from '@typescript-eslint/parser';
import typescript from '@typescript-eslint/eslint-plugin';
import security from 'eslint-plugin-security';
import unsanitized from 'eslint-plugin-no-unsanitized';

export default [
  { ignores: ['dist/**', 'release/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser, ecmaVersion: 2022, sourceType: 'module',
      globals: { setTimeout: 'readonly', setInterval: 'readonly', execScript: 'readonly', window: 'readonly' },
    },
    plugins: { '@typescript-eslint': typescript, security, 'no-unsanitized': unsanitized },
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-unsafe-regex": "warn",
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "error",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-no-csrf-before-method-override": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-non-literal-require": "warn",
      "security/detect-object-injection": "off",
      "security/detect-possible-timing-attacks": "warn",
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
      "eqeqeq": [
            "warn",
            "always"
      ],
      "no-var": "error",
      "prefer-const": "warn",
      "prefer-template": "warn",
      "no-shadow": "warn",
      "no-unused-vars": "off",
      "no-empty": "warn",
      "@typescript-eslint/no-var-requires": "warn",
      "@typescript-eslint/no-unused-vars": [
            "warn",
            {
                  "argsIgnorePattern": "^_"
            }
      ]
},
  },
  {
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/test-*.ts'],
    rules: {
      "no-console": "off",
      "no-empty": "off",
      "@typescript-eslint/no-var-requires": "off",
      "no-useless-escape": "off",
      "no-control-regex": "off",
      "eqeqeq": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "security/detect-non-literal-regexp": "off"
},
  },
];
