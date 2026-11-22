import path from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const alias = { '@': path.resolve(import.meta.dirname, 'src') };
const plugins = [
  swc.vite({
    // The build exclusions in .swcrc must not apply to test files.
    swcrc: false,
    jsc: {
      target: 'es2022',
      parser: { syntax: 'typescript', decorators: true },
      transform: { legacyDecorator: true, decoratorMetadata: true },
      keepClassNames: true,
    },
    module: { type: 'es6' },
  }),
];

export default defineConfig({
  plugins,
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['**/*.int.test.ts', '**/node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['**/*.int.test.ts'],
          exclude: ['**/node_modules/**'],
          globalSetup: ['./test/global-setup.ts'],
          setupFiles: ['./test/env.ts'],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
