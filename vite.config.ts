import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'react-helmet-async',
      '@sudobility/components',
      '@sudobility/building_blocks',
      '@sudobility/svgr_client',
    ],
    alias: {
      react: resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
      'react-helmet-async': resolve(
        __dirname,
        'node_modules/react-helmet-async',
      ),
      '@sudobility/svgr_client': resolve(
        __dirname,
        'node_modules/@sudobility/svgr_client',
      ),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  server: {
    port: 5175,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
