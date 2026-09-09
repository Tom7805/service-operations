import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from './icons';

export interface RowAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
  /** Vô hiệu hóa mục nhưng vẫn hiển thị, kèm lý do trong `title`. */
  disabled?: boolean;
  disabledReason?: string;
  /** Gắn `data-testid` lên nút mục để test truy vấn được sau khi mở menu. */
  testId?: string;
}

interface RowActionsMenuProps {
  actions: RowAction[];
  /** Nhãn cho trình đọc màn hình khi một dòng cần mô tả riêng. */
  ariaLabel?: string;
}

const VIEWPORT_MARGIN = 8; // luôn chừa mép màn hình
const ITEM_HEIGHT = 40; // ước lượng chiều cao một mục (padding + chữ)
const PANEL_PADDING = 12; // đệm trên+dưới của panel

/**
 * Menu thao tác theo dòng (⋮) — mẫu CHUẨN cho mọi bảng dữ liệu trong hệ.
 *
 * DESIGN.md § Components: "Hành động theo hàng: menu kebab (⋮) gộp thao tác,
 * không phải dãy nút rời." Dãy 2-4 nút icon trên mỗi dòng vừa tốn diện tích
 * ngang — thứ khan hiếm nhất trong bảng dữ liệu — vừa buộc người dùng đoán
 * nghĩa từng icon; menu gộp cho phép hiện NHÃN CHỮ đầy đủ.
 *
 * Panel bung ra dùng `position: fixed` và toạ độ tính từ nút ⋮ lúc mở — nhờ vậy
 * KHÔNG bị `overflow: hidden` của thẻ bảng (dùng để bo góc) cắt cụt khi dòng nằm
 * ở cuối bảng/cuối trang. Panel tự chọn bung xuống hay lên trên tuỳ khoảng trống
 * thật của khung nhìn, và có `max-height` + cuộn trong nếu quá cao.
 */
export const RowActionsMenu: React.FC<RowActionsMenuProps> = ({ actions, ariaLabel = 'Thao tác' }) => {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const positionPanel = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const gap = 4;
    const estimatedHeight = actions.length * ITEM_HEIGHT + PANEL_PADDING;
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;
    // Chỉ bung lên khi bên dưới không đủ và bên trên rộng hơn.
    const up = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const style: CSSProperties = {
      position: 'fixed',
      // Neo mép phải panel theo mép phải nút ⋮ (menu vốn canh phải).
      right: Math.max(VIEWPORT_MARGIN, Math.round(window.innerWidth - rect.right)),
      // Không bao giờ để panel co về 0 — nếu chật quá thì cho cuộn trong.
      maxHeight: Math.max(140, (up ? spaceAbove : spaceBelow) - gap),
    };
    if (up) style.bottom = Math.round(window.innerHeight - rect.top + gap);
    else style.top = Math.round(rect.bottom + gap);

    setOpenUpward(up);
    setPanelStyle(style);
  }, [actions.length]);

  // Đo & đặt vị trí ngay trước khi trình duyệt vẽ, tránh nhấp nháy ở góc cũ.
  useLayoutEffect(() => {
    if (open) positionPanel();
  }, [open, positionPanel]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    // Cuộn bất kỳ khung nào (capture) hoặc đổi cỡ cửa sổ: bám lại theo nút ⋮.
    const reposition = () => positionPanel();
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, positionPanel]);

  return (
    <div className="row-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="row-menu__trigger"
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {ICONS.more}
      </button>
      {/* Chỉ dựng nội dung menu KHI MỞ — bảng 25 dòng trước đây dựng sẵn 125 mục +
          125 SVG ẩn, chiếm 72% tổng SVG của trang và gây tác vụ dài khi mở. */}
      <div
        className={`row-menu__panel ${open ? 'row-menu__panel--open' : ''} ${openUpward ? 'row-menu__panel--up' : ''}`}
        role="menu"
        style={open ? panelStyle : undefined}
      >
        {open &&
          actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              data-testid={action.testId}
              className={`row-menu__item ${action.tone === 'danger' ? 'row-menu__item--danger' : ''}`}
              title={action.disabled ? action.disabledReason ?? action.label : action.label}
              disabled={action.disabled}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
            >
              <span className="row-menu__icon">{action.icon}</span>
              {action.label}
            </button>
          ))}
      </div>
    </div>
  );
};

export default RowActionsMenu;
