import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
const GAP = 4; // khoảng cách panel ↔ nút ⋮

/**
 * Menu thao tác theo dòng (⋮) — mẫu CHUẨN cho mọi bảng dữ liệu trong hệ.
 *
 * DESIGN.md § Components: "Hành động theo hàng: menu kebab (⋮) gộp thao tác,
 * không phải dãy nút rời." Dãy 2-4 nút icon trên mỗi dòng vừa tốn diện tích
 * ngang — thứ khan hiếm nhất trong bảng dữ liệu — vừa buộc người dùng đoán
 * nghĩa từng icon; menu gộp cho phép hiện NHÃN CHỮ đầy đủ.
 *
 * Panel được render bằng React portal thẳng vào <body> và định vị `position: fixed`
 * theo toạ độ nút ⋮ lúc mở. Nhờ vậy nó KHÔNG bị `overflow: hidden` của thẻ bảng
 * (dùng để bo góc) cắt cụt, cũng không bị "kẹt" trong ngữ cảnh xếp chồng / containing
 * block do animation/transform của khối cha tạo ra — đây là lý do trước đây panel
 * mở ở dòng cuối bảng bị che mất gần hết. Panel tự chọn bung lên/xuống theo khoảng
 * trống khung nhìn và có `max-height` + cuộn trong nếu quá cao.
 */
export const RowActionsMenu: React.FC<RowActionsMenuProps> = ({ actions, ariaLabel = 'Thao tác' }) => {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({ position: 'fixed', visibility: 'hidden' });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const positionPanel = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const estimatedHeight = actions.length * ITEM_HEIGHT + PANEL_PADDING;
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;
    // Chỉ bung lên khi bên dưới không đủ và bên trên rộng hơn.
    const up = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const style: CSSProperties = {
      position: 'fixed',
      // Neo mép phải panel theo mép phải nút ⋮ (menu vốn canh phải).
      right: Math.max(VIEWPORT_MARGIN, Math.round(window.innerWidth - rect.right)),
      // Không để panel co về 0 — nếu chật quá thì cho cuộn trong.
      maxHeight: Math.max(160, Math.round((up ? spaceAbove : spaceBelow) - GAP)),
    };
    if (up) style.bottom = Math.round(window.innerHeight - rect.top + GAP);
    else style.top = Math.round(rect.bottom + GAP);

    setOpenUpward(up);
    setPanelStyle(style);
  }, [actions.length]);

  // Đo & đặt vị trí ngay trước khi trình duyệt vẽ, tránh nhấp nháy ở góc cũ.
  useLayoutEffect(() => {
    if (open) positionPanel();
    else setPanelStyle({ position: 'fixed', visibility: 'hidden' });
  }, [open, positionPanel]);

  useEffect(() => {
    if (!open) return;
    const isInside = (node: Node) =>
      !!triggerRef.current?.contains(node) || !!panelRef.current?.contains(node);
    const handleClickOutside = (event: MouseEvent) => {
      if (!isInside(event.target as Node)) setOpen(false);
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

  const panel = (
    <div
      ref={panelRef}
      className={`row-menu__panel row-menu__panel--open ${openUpward ? 'row-menu__panel--up' : ''}`}
      role="menu"
      style={panelStyle}
    >
      {actions.map((action) => (
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
  );

  return (
    <div className="row-menu">
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
      {/* Chỉ dựng nội dung menu KHI MỞ, và render thẳng vào <body> để thoát mọi
          overflow:hidden / containing-block của khối cha. */}
      {open && typeof document !== 'undefined' && createPortal(panel, document.body)}
    </div>
  );
};

export default RowActionsMenu;
