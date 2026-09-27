import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Biên dịch sẵn khung ứng dụng và mọi màn hình ngay khi khởi động dev server, thay vì đợi trình
    // duyệt xin tới từng tệp mới biên dịch — lần mở trang/bấm menu đầu tiên không phải chờ biên dịch.
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx', './src/modules/**/pages/*.tsx', './src/modules/portal/PortalApp.tsx'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Thư viện ít thay đổi tách thành khối riêng: trình duyệt giữ trong bộ đệm qua các lần cập nhật
        // mã nghiệp vụ, không phải tải lại React và bộ icon mỗi lần phát hành.
        manualChunks: {
          react: ['react', 'react-dom'],
          icons: ['@phosphor-icons/react'],
        },
      },
    },
  },
});
