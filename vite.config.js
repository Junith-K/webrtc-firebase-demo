const { defineConfig } = require('vite');

module.exports = defineConfig({
  server: {
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    outDir: 'dist',
  },
});
