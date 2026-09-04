import { FlatCompat } from '@eslint/eslintrc';
import nextVitals from 'eslint-config-next/core-web-vitals.js';
import nextTs from 'eslint-config-next/typescript.js';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts'],
  },
  ...compat.extends('next', 'next/core-web-vitals', 'next/typescript'),
];
