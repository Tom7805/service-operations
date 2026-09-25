import { useCallback, useEffect, useRef } from 'react';
import { fetchCurrentUser, SessionSyncError } from '../modules/auth/api/authApi';
import type { AuthSession, CurrentUser } from '../modules/auth/types/authTypes';

/** Chu kỳ tự làm mới phiên khi tab đang mở (ms). */
const POLL_INTERVAL_MS = 30_000;

interface UseSessionSyncOptions {
  /** Phiên hiện tại; null nghĩa là chưa đăng nhập — hook không làm gì. */
  session: AuthSession | null;
  /** Gọi khi vai trò / họ tên trên máy chủ đã khác phiên hiện tại. */
  onRefresh: (next: AuthSession) => void;
  /** Gọi khi máy chủ trả 401 (token đã bị vô hiệu) — nên đăng xuất. */
  onExpired: () => void;
}

/** So sánh hai danh sách vai trò theo tập hợp, không quan tâm thứ tự. */
function rolesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((r) => setB.has(r));
}

/**
 * NCL-01-CN-004 TC-03: giữ vai trò & phạm vi của phiên đang đăng nhập luôn khớp máy chủ
 * mà KHÔNG bắt đăng nhập lại. Backend đã nạp lại quyền mỗi request (JwtAuthFilter); phần
 * còn thiếu là giao diện — hook này gọi GET /auth/me khi:
 *  - vừa mount,
 *  - cửa sổ được focus lại / tab chuyển sang hiển thị (đúng thao tác test 2 trình duyệt),
 *  - và định kỳ mỗi 30s (tạm dừng khi tab bị ẩn, chạy lại ngay khi hiện lại).
 * An toàn khi hỏng: lỗi mạng bị nuốt, lần sau thử lại; chỉ 401 mới kích hoạt đăng xuất.
 */
export function useSessionSync({ session, onRefresh, onExpired }: UseSessionSyncOptions): void {
  const inFlight = useRef(false);

  // Giữ tham chiếu mới nhất để listener/interval không cần gắn lại mỗi lần đổi.
  const ref = useRef({ session, onRefresh, onExpired });
  ref.current = { session, onRefresh, onExpired };

  const sync = useCallback(async () => {
    const { session: current, onRefresh: refresh, onExpired: expired } = ref.current;
    if (!current || inFlight.current) return;
    inFlight.current = true;
    try {
      const fresh: CurrentUser = await fetchCurrentUser(current.accessToken);
      if (!rolesEqual(current.roles, fresh.roles) || current.fullName !== fresh.fullName) {
        refresh({ ...current, ...fresh });
      }
    } catch (err) {
      if (err instanceof SessionSyncError && err.status === 401) {
        expired();
      }
      // Lỗi khác (mạng / máy chủ tạm lỗi): bỏ qua, lần polling sau thử lại.
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    void sync();

    // Chi poll khi tab DANG HIEN: tab an (nguoi dung de may o hien truong, mo tab
    // khac) khong can goi /auth/me moi 30s — ton pin, ton 3G. Quay lai tab thi
    // dong bo NGAY roi moi chay lai nhip 30s.
    let timer: number | undefined;
    const start = () => {
      if (timer === undefined) timer = window.setInterval(() => void sync(), POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else {
        void sync();
        start();
      }
    };
    const onFocus = () => void sync();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    if (document.visibilityState !== 'hidden') start();

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      stop();
    };
    // Chỉ cần gắn lại khi chuyển giữa "có phiên" và "không phiên".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session === null, sync]);
}
