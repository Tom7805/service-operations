import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import { installFetchDedupe } from './utils/dedupeFetch';
import { installModalEscape } from './utils/modalEscape';
import { applyPreferences, readCachedPreferences } from './utils/preferences';
// Phông giao diện tự lưu trong dự án (không tải qua mạng lúc chạy) — nạp TRƯỚC stylesheet chính.
import '@fontsource-variable/manrope';
import './assets/styles/index.css';

// Gộp các GET giống hệt nhau đang chạy cùng lúc tới backend (xem utils/dedupeFetch.ts).
installFetchDedupe((url) => url.includes('/api/v1/'));
// Esc đóng hộp thoại trên cùng ở mọi màn hình (xem utils/modalEscape).
installModalEscape();
// Chủ đề/mật độ của lần dùng trước trên máy này — áp TRƯỚC khi vẽ, không nháy trắng ở giao diện tối.
applyPreferences(readCachedPreferences());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
