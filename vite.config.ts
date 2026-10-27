import { defineConfig } from 'vite';

// Relative base so the build can live in any subfolder (e.g. squidzombie.com/pinball/).
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
});
