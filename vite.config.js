const { defineConfig } = require('vite');

module.exports = defineConfig({
  base: './', // Ensure base path is relative
  build: {
    outDir: 'dist', // Output directory for build
    rollupOptions: {
      output: {
        entryFileNames: '[name].js', // Output entry file name format
        chunkFileNames: '[name].js', // Output chunk file name format
        assetFileNames: '[name].[ext]', // Output asset file name format
      },
    },
  },
});
