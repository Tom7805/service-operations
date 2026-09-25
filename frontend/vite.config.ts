import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Tach thu vien ben thu ba thanh cac chunk on dinh: doi code nghiep vu
        // khong lam mat cache trinh duyet cua React/Redux/icon.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\/]node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return 'vendor-react';
          if (/[\/]node_modules[\/](@reduxjs|react-redux|redux|immer|reselect)[\/]/.test(id)) return 'vendor-state';
          if (id.includes('@phosphor-icons')) return 'vendor-icons';
          if (id.includes('qrcode')) return 'vendor-qrcode';
          return 'vendor';
        },
      },
    },
  },
});
