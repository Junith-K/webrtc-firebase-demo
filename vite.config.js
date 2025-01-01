const { defineConfig } = require('vite');

module.exports = defineConfig({
  base: './', // Ensures paths are relative
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js', // No hash for JS files
        chunkFileNames: '[name].js', // No hash for chunks
        assetFileNames: '[name].[ext]', // No hash for assets like CSS or images
      },
    },
  },
});
