import { useEffect } from 'react';

/**
 * Hé lộ nội dung nằm dưới nếp gấp khi nó thật sự lọt vào khung nhìn.
 *
 * Vì sao dùng IntersectionObserver chứ không phải `window.addEventListener('scroll')`:
 * scroll listener chạy ở mọi khung hình khi cuộn, mỗi lần lại phải đọc `getBoundingClientRect`
 * gây reflow liên tục — trên điện thoại là rơi khung hình thấy rõ. IntersectionObserver để
 * trình duyệt tự tính ngoài luồng chính và chỉ gọi lại khi trạng thái đổi.
 *
 * An toàn khi hỏng: trạng thái mặc định trong CSS là ĐÃ HIỆN. Hook mới gắn
 * `data-reveal="pending"` để ẩn đi. Nên nếu JS lỗi hoặc chưa chạy, nội dung vẫn đọc được —
 * không bao giờ để người dùng nhìn vào một trang trắng vì hiệu ứng không khởi động.
 *
 * @param deps  Đổi giá trị này (ví dụ tab đang mở) để quét lại khi nội dung trang thay đổi.
 */
export function useScrollReveal(deps: unknown = null): void {
  useEffect(() => {
    // Người dùng đã yêu cầu giảm chuyển động thì không ẩn gì hết.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).setAttribute('data-reveal', 'shown');
          // Hé lộ một lần rồi thôi: nội dung không được nhấp nháy khi cuộn lên xuống.
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    );

    /** Chỉ xử lý mục CHƯA được đánh dấu — gọi lại nhiều lần vẫn rẻ và không ẩn lại thứ đã hiện. */
    const scan = (): boolean => {
      const targets = document.querySelectorAll<HTMLElement>('[data-reveal-target]:not([data-reveal])');
      if (targets.length === 0) return false;
      const viewportH = window.innerHeight;
      targets.forEach((el) => {
        // Thứ đã nằm trong khung nhìn ngay từ đầu thì hiện luôn — nó thuộc về hiệu ứng
        // xổ trang, không phải hiệu ứng cuộn. Ẩn nó đi rồi hiện lại là một nhịp giật thừa.
        if (el.getBoundingClientRect().top < viewportH * 0.9) {
          el.setAttribute('data-reveal', 'shown');
          return;
        }
        el.setAttribute('data-reveal', 'pending');
        io.observe(el);
      });
      return true;
    };

    // Trang là chunk lazy + dữ liệu tải bất đồng bộ: lúc effect này chạy, nội dung
    // thật thường CHƯA có trong DOM (còn đang hiện khung xương). Theo dõi DOM trong
    // một khoảng ngắn để bắt các mục xuất hiện muộn, rồi ngắt hẳn — không để một
    // MutationObserver chạy mãi trên bảng dữ liệu dày.
    let mo: MutationObserver | null = null;
    let raf = 0;
    let stopTimer = 0;
    const stopWatching = () => {
      mo?.disconnect();
      mo = null;
      cancelAnimationFrame(raf);
      window.clearTimeout(stopTimer);
    };
    if (!scan() && typeof MutationObserver !== 'undefined') {
      const root = document.getElementById('noi-dung-chinh') ?? document.body;
      mo = new MutationObserver(() => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (scan()) stopWatching();
        });
      });
      mo.observe(root, { childList: true, subtree: true });
      stopTimer = window.setTimeout(stopWatching, 5000);
    }

    return () => {
      stopWatching();
      io.disconnect();
    };
  }, [deps]);
}

export default useScrollReveal;
