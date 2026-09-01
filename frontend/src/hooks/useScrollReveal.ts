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

    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-target]'));
    if (targets.length === 0) return;

    const viewportH = window.innerHeight;
    const observed: HTMLElement[] = [];

    targets.forEach((el) => {
      // Thứ đã nằm trong khung nhìn ngay từ đầu thì hiện luôn — nó thuộc về hiệu ứng
      // xổ trang, không phải hiệu ứng cuộn. Ẩn nó đi rồi hiện lại là một nhịp giật thừa.
      if (el.getBoundingClientRect().top < viewportH * 0.9) {
        el.setAttribute('data-reveal', 'shown');
        return;
      }
      el.setAttribute('data-reveal', 'pending');
      observed.push(el);
    });

    if (observed.length === 0) return;

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

    observed.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [deps]);
}

export default useScrollReveal;
