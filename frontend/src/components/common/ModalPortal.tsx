import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Bọc phần thân của một modal (thường là `<div className="modal-backdrop">…`).
 *
 * - **Render qua portal ra `<body>`**: `.modal-backdrop` dùng `position: fixed;
 *   inset: 0` để phủ kín và căn giữa màn hình, nhưng nếu modal nằm sâu trong cây
 *   có khối cha mang `transform` / `will-change: transform` / `filter` (ví dụ hệ
 *   hiệu ứng "xổ trang" của `.user-management-page`), khối đó trở thành
 *   *containing block* và `position: fixed` neo vào nó thay vì viewport → modal
 *   lệch lên góc, phủ nền không kín. Portal đưa modal ra thẳng `<body>` nên hết lệch.
 * - **Khoá cuộn nền** khi modal đang mở: đặt `overflow: hidden` cho `<body>` và
 *   khôi phục lại đúng giá trị cũ khi đóng.
 *
 * Chỉ mount component này khi modal thực sự mở (các modal đã tự `return null` khi
 * `!isOpen`), nên khoá cuộn chỉ có hiệu lực đúng lúc cần.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
