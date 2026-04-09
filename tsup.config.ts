import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    clean: true,
    sourcemap: true,
    target: 'node20',
    outDir: 'dist',
    splitting: false,
    external: ['clawpowers', 'openclaw', 'openclaw/plugin-sdk'],
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  {
    entry: ['src/index.ts', 'src/openclaw-plugin.ts'],
    format: ['esm'],
    dts: true,
    clean: false,
    sourcemap: true,
    target: 'node20',
    outDir: 'dist',
    splitting: false,
    external: ['clawpowers', 'openclaw', 'openclaw/plugin-sdk'],
  },
]);
