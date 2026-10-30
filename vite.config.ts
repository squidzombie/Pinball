import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

const MANUAL = 'docs/manual/cyber-psychosis-manual.pdf';

/** The game manual's PDF, served and built as manual.pdf: the start screen links to it. */
function manualPdf(): Plugin {
  return {
    name: 'manual-pdf',
    configureServer(server) {
      server.middlewares.use('/manual.pdf', (_req, res) => {
        res.setHeader('Content-Type', 'application/pdf');
        res.end(readFileSync(MANUAL));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manual.pdf', source: readFileSync(MANUAL) });
    },
  };
}

// Relative base so the build can live in any subfolder (e.g. squidzombie.com/pinball/).
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
  plugins: [manualPdf()],
});
