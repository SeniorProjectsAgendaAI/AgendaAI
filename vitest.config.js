import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.js',
    alias: {
      // This forces Vitest to use the React version in the frontend folder
      // so it doesn't get confused by the root node_modules
      'react': path.resolve(__dirname, './frontend/node_modules/react'),
      'react-dom': path.resolve(__dirname, './frontend/node_modules/react-dom'),
    },
  },
});