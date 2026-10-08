import js from '@eslint/js';
import {defineConfig} from 'eslint/config';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// Accounting's acceptance plan requires lint. Keep its initial scope explicit;
// adding this gate does not imply that unrelated modules have been linted.
const browser = ['src/Accounting*.tsx', 'src/accountingRequest.ts'];
const server = ['server/domain/accounting/accounting*.mjs', 'tests/accounting*.test.mjs', 'tests/e2e/accounting*.{ts,mjs}'];
const unused = {argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true};

export default defineConfig(
  {ignores: ['mobile/**', 'dist/**', '.data/**', '.local-runtime/**']},
  {
    files: [...browser, ...server],
    extends: [js.configs.recommended],
    rules: {'no-unused-vars': ['error', unused]},
  },
  {files: browser, languageOptions: {globals: globals.browser}},
  {files: ['server/domain/accounting/accounting*.mjs', 'tests/accounting*.test.mjs'], languageOptions: {globals: globals.node}},
  {files: ['tests/e2e/accounting*.{ts,mjs}'], languageOptions: {globals: {...globals.node, ...globals.browser}}},
  {
    files: [...browser, 'tests/e2e/accounting*.ts'],
    extends: [tseslint.configs.recommended],
    rules: {'@typescript-eslint/no-unused-vars': ['error', unused]},
  },
);
