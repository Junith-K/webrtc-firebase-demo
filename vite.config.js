// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8080, // Set your desired port here
    hmr: {
      overlay: false, // Disable the overlay to prevent unwanted reloads
    }
  },
  build: {
    outDir: 'dist', // Default output directory
  },
});
