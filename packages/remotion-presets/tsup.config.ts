import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    animations: 'src/animations.ts',
    effects: 'src/effects.ts',
    looks: 'src/looks.ts',
    registry: 'src/registry.ts',
    text: 'src/text.ts',
    transitions: 'src/transitions.ts',
  },
  clean: true,
  dts: true,
  format: ['esm', 'cjs'],
  external: [
    'react',
    'react-dom',
    'remotion',
    '@remotion/effects',
    '@remotion/media',
    '@remotion/transitions',
  ],
  sourcemap: true,
  splitting: false,
  treeshake: true,
});
