import { useCallback, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

/**
 * Trả về cặp `{ onMouseDown, onClick }` gắn lên phần tử nền mờ (`.modal-backdrop`)
 * của một modal, để đóng modal khi bấm vào khoảng trống nhưng KHÔNG đóng nhầm khi
 * người dùng kéo-thả chuột (ví dụ bôi đen văn bản trong form) rồi lỡ thả chuột ra
 * ngoài `modal-card`.
 *
 * Trình duyệt xác định target của sự kiện `click` theo điểm THẢ chuột (mouseup),
 * không phải điểm bắt đầu (mousedown). Nếu mousedown bắt đầu bên trong `modal-card`
 * rồi kéo ra ngoài, `click` vẫn nổ ra trên nền mờ dù người dùng không có ý định đóng
 * modal — chỉ dựa vào `e.target === e.currentTarget` trên `onClick` (cách làm cũ ở
 * hầu hết modal trong app) không chặn được trường hợp này. Hook này chỉ đóng khi
 * *cả* mousedown lẫn click đều nổ ra trực tiếp trên chính nền mờ.
 *
 * @param onBackdropClose Hàm đóng modal (hoặc set state tương ứng về `null`).
 * @param disabled Khi `true` (ví dụ đang submit/loading), bấm nền mờ sẽ không đóng —
 *                  giữ đúng hành vi mà một số modal đã có từ trước.
 */
export function useBackdropClick(onBackdropClose: () => void, disabled = false) {
  const mouseDownOnBackdrop = useRef(false);

  const onMouseDown = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget;
  }, []);

  const onClick = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if (disabled) return;
      if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
        onBackdropClose();
      }
    },
    [onBackdropClose, disabled]
  );

  return { onMouseDown, onClick };
}
