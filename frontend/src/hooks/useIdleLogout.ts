import { useEffect, useRef } from 'react';

/** Khóa localStorage lưu thời điểm thao tác gần nhất — dùng chung giữa các tab cùng phiên. */
export const LAST_ACTIVITY_KEY = 'lastActivityAt';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'wheel', 'scroll', 'touchstart'] as const;
/** Ghi localStorage tối đa mỗi 5 giây một lần — mousemove bắn rất dày. */
const WRITE_THROTTLE_MS = 5_000;
const CHECK_INTERVAL_MS = 15_000;

/** Số phút không thao tác trước khi tự đăng xuất; đổi qua VITE_SESSION_IDLE_MINUTES. */
export const SESSION_IDLE_MINUTES = (() => {
  const raw = Number(import.meta.env.VITE_SESSION_IDLE_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
})();

function readStoredActivity(): number {
  try {
    const value = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** Đánh dấu "vừa thao tác" — gọi ngay khi đăng nhập để phiên mới không bị coi là đã quá hạn. */
export function markActivity(now: number = Date.now()): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  } catch {
    // Trình duyệt chặn localStorage: vẫn chạy được, chỉ không đồng bộ giữa các tab.
  }
}

interface UseIdleLogoutOptions {
  enabled: boolean;
  onIdle: () => void;
  timeoutMs?: number;
}

/**
 * NCL-01-CN-001-TC-03: phiên làm việc để quá lâu không thao tác thì bắt đăng nhập lại.
 *
 * Chỉ tính thao tác THẬT của người dùng (chuột, bàn phím, cuộn, chạm) — các lượt gọi API chạy nền
 * (làm mới phiên 30 giây/lần, đếm thông báo chưa đọc) không làm phiên "sống lại". Thời điểm thao tác
 * gần nhất lưu ở localStorage nên người dùng còn làm việc ở một tab thì tab khác không tự đăng xuất.
 */
export function useIdleLogout({ enabled, onIdle, timeoutMs = SESSION_IDLE_MINUTES * 60_000 }: UseIdleLogoutOptions): void {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;

    let lastLocal = Math.max(readStoredActivity(), 0);
    let lastWrite = 0;
    let fired = false;

    const check = () => {
      if (fired) return;
      const last = Math.max(lastLocal, readStoredActivity());
      if (last > 0 && Date.now() - last >= timeoutMs) {
        fired = true;
        onIdleRef.current();
      }
    };

    // Mở lại trình duyệt sau một thời gian dài: phiên cũ đã quá hạn thì đăng xuất ngay.
    if (lastLocal === 0) {
      lastLocal = Date.now();
      markActivity(lastLocal);
    }
    check();

    const onActivity = () => {
      const now = Date.now();
      lastLocal = now;
      if (now - lastWrite >= WRITE_THROTTLE_MS) {
        lastWrite = now;
        markActivity(now);
      }
    };

    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, onActivity, { passive: true }));
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, onActivity));
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, timeoutMs]);
}
