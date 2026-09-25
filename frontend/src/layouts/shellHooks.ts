import { useCallback, useSyncExternalStore } from 'react';

/** Theo doi mot media query (vd. khung hep cua dien thoai). An toan khi khong co matchMedia (jsdom). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = typeof window !== 'undefined' ? window.matchMedia?.(query) : undefined;
      if (!mql) return () => {};
      mql.addEventListener?.('change', onChange);
      return () => mql.removeEventListener?.('change', onChange);
    },
    [query]
  );
  const getSnapshot = () => (typeof window !== 'undefined' ? Boolean(window.matchMedia?.(query)?.matches) : false);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Cac phan tu nhan focus duoc va dang hien thi trong `root`. */
export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

/**
 * Doi toi khi phan tu khop `selector` xuat hien trong `root` (trang lazy + du lieu bat dong
 * bo), roi goi `cb` mot lan. Tu ngat sau `timeoutMs` va goi `onTimeout` neu co.
 * Tra ve ham huy.
 */
export function whenElementAppears(
  root: HTMLElement,
  selector: string,
  cb: (el: HTMLElement) => void,
  timeoutMs: number,
  onTimeout?: () => void
): () => void {
  const found = root.querySelector<HTMLElement>(selector);
  if (found) {
    cb(found);
    return () => {};
  }
  let done = false;
  let raf = 0;
  const finish = () => {
    done = true;
    mo.disconnect();
    cancelAnimationFrame(raf);
    window.clearTimeout(timer);
  };
  const mo = new MutationObserver(() => {
    if (done || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const el = root.querySelector<HTMLElement>(selector);
      if (el && !done) {
        finish();
        cb(el);
      }
    });
  });
  mo.observe(root, { childList: true, subtree: true });
  const timer = window.setTimeout(() => {
    if (done) return;
    finish();
    onTimeout?.();
  }, timeoutMs);
  return () => {
    if (!done) finish();
  };
}
