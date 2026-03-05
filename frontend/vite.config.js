import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        inventory: resolve(__dirname, 'inventory.html'),
        sales: resolve(__dirname, 'sales.html'),
        returns: resolve(__dirname, 'returns.html'),
        reports: resolve(__dirname, 'reports.html'),
        approvals: resolve(__dirname, 'approvals.html')
      }
    },
    outDir: 'dist'
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
