import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Tiện ích giao diện dùng chung cho nhóm trang "delivery" (dự án, công việc, giờ công,
 * chi phí, nghiệm thu, đơn giá). Chỉ xử lý hành vi hiển thị/trợ năng — không chạm logic nghiệp vụ.
 */

// Ngăn xếp các hộp thoại đang mở: Esc chỉ đóng hộp thoại NẰM TRÊN CÙNG, để một modal con
// (ví dụ "Giao việc" mở trên "Cấu trúc WBS") không kéo theo đóng luôn modal cha.
const dialogStack: symbol[] = [];

const FOCUSABLE =
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Hành vi chuẩn cho một modal: Esc để đóng (trừ khi đang bận gửi), đưa focus vào trong
 * hộp thoại khi mở và trả focus về chỗ cũ khi đóng.
 *
 * Gắn `ref` trả về lên `.modal-card`. Gọi hook trước mọi `return null` sớm và truyền
 * `open` tương ứng.
 */
export function useDialogA11y<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
  busy = false
) {
  const ref = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  onCloseRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return undefined;
    const id = Symbol('dialog');
    dialogStack.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Chỉ dời focus khi chưa có phần tử nào bên trong đã tự lấy focus (autoFocus).
    const card = ref.current;
    if (card && !card.contains(document.activeElement)) {
      const preferred =
        card.querySelector<HTMLElement>('.modal-body ' + FOCUSABLE.split(', ').join(', .modal-body ')) ??
        card.querySelector<HTMLElement>(FOCUSABLE);
      if (preferred) preferred.focus({ preventScroll: true });
      else {
        if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '-1');
        card.focus({ preventScroll: true });
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (dialogStack[dialogStack.length - 1] !== id) return;
      if (busyRef.current) return;
      e.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const idx = dialogStack.indexOf(id);
      if (idx >= 0) dialogStack.splice(idx, 1);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return ref;
}

/** Giá trị trễ `delay` ms — dùng cho ô tìm kiếm gọi API. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Chống phản hồi đến trễ ghi đè phản hồi mới hơn (đổi tuần/bộ lọc liên tục):
 * `const token = begin();` … `if (!isLatest(token)) return;`
 */
export function useLatestRequest() {
  const seq = useRef(0);
  const begin = useCallback(() => {
    seq.current += 1;
    return seq.current;
  }, []);
  const isLatest = useCallback((token: number) => token === seq.current, []);
  useEffect(
    () => () => {
      // Huỷ mọi phản hồi đang chờ khi unmount để không setState trên component đã gỡ.
      seq.current += 1;
    },
    []
  );
  // Đối tượng ổn định: an toàn khi đưa vào mảng phụ thuộc của useCallback/useEffect.
  return useMemo(() => ({ begin, isLatest }), [begin, isLatest]);
}

/** Toast tự ẩn sau `ms`, dọn timer khi đổi toast/unmount (tránh toast cũ xoá toast mới). */
export function useAutoDismiss<T>(value: T | null, clear: () => void, ms = 4000) {
  const clearRef = useRef(clear);
  clearRef.current = clear;
  useEffect(() => {
    if (value == null) return undefined;
    const timer = window.setTimeout(() => clearRef.current(), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
}

const PHONE_QUERY = '(max-width: 640px)';

function matchPhone(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(PHONE_QUERY).matches;
}

/**
 * `true` khi khung nhìn ở cỡ điện thoại (≤640px). Dùng để đặt nút hành động chính vào
 * thanh dính đáy màn hình thay vì nhân đôi nút (một nút duy nhất, đổi chỗ theo khổ màn hình).
 */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(matchPhone);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsPhone(mql.matches);
    onChange();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);
  return isPhone;
}
