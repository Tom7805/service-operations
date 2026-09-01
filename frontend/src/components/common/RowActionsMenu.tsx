import React, { useEffect, useRef, useState } from 'react';
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
}

interface RowActionsMenuProps {
  actions: RowAction[];
  /** Nhãn cho trình đọc màn hình khi một dòng cần mô tả riêng. */
  ariaLabel?: string;
}

/**
 * Menu thao tác theo dòng (⋮) — mẫu CHUẨN cho mọi bảng dữ liệu trong hệ.
 *
 * DESIGN.md § Components: "Hành động theo hàng: menu kebab (⋮) gộp thao tác,
 * không phải dãy nút rời." Dãy 2-4 nút icon trên mỗi dòng vừa tốn diện tích
 * ngang — thứ khan hiếm nhất trong bảng dữ liệu — vừa buộc người dùng đoán
 * nghĩa từng icon; menu gộp cho phép hiện NHÃN CHỮ đầy đủ.
 *
 * Trước đây component này bị chép hai bản giống nhau ở DepartmentTree và
 * UserTable. Đã tách về đây làm một nguồn duy nhất.
 */
export const RowActionsMenu: React.FC<RowActionsMenuProps> = ({ actions, ariaLabel = 'Thao tác' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="row-menu" ref={containerRef}>
      <button
        type="button"
        className="row-menu__trigger"
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {ICONS.more}
      </button>
      <div className={`row-menu__panel ${open ? 'row-menu__panel--open' : ''}`} role="menu">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            role="menuitem"
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
