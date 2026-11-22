import { defineConfig } from 'tsdown';

export default defineConfig({
  // One entry per component, plus the barrel. `unbundle` keeps one output file
  // per source module, so every module keeps its own "use client" directive
  // and bundlers can drop whatever a consumer doesn't import.
  entry: ['src/index.ts', 'src/*/index.ts'],
  unbundle: true,
  format: 'esm',
  platform: 'browser',
  dts: true,
  sourcemap: true,
  clean: true,
  banner: { js: "'use client';" },
  copy: [{ from: 'src/styles.css' }],
});
