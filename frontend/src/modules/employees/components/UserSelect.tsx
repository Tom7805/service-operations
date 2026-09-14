import { useEffect, useId, useRef, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { AssignableUser } from '../types/employeeTypes';

interface UserSelectProps {
  users: AssignableUser[];
  value: number | '';
  onChange: (userId: number | '') => void;
  disabled?: boolean;
  hasError?: boolean;
  placeholder?: string;
  inputId?: string;
}

/**
 * Combobox chọn tài khoản nhân viên. Dùng danh sách tự dựng (không phải <select> gốc) để:
 *  - luôn nằm gọn trong một hộp có chiều cao cố định + cuộn dọc, không "xổ" tràn ra ngoài modal;
 *  - tránh độ trễ khi rê chuột của popup <select> gốc khi modal có nền kính (backdrop-filter).
 */
export default function UserSelect({
  users,
  value,
  onChange,
  disabled = false,
  hasError = false,
  placeholder = '-- Chọn tài khoản --',
  inputId,
}: UserSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selected = users.find((u) => u.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocPointer);
    return () => document.removeEventListener('mousedown', onDocPointer);
  }, [open]);

  useEffect(() => {
    if (open) {
      const current = users.findIndex((u) => u.id === value);
      setActiveIndex(current >= 0 ? current : firstSelectable(users));
    }
  }, [open, users, value]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    node?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const commit = (index: number) => {
    const user = users[index];
    if (!user || user.hasEmployeeProfile) return;
    onChange(user.id);
    setOpen(false);
  };

  const moveActive = (dir: 1 | -1) => {
    if (users.length === 0) return;
    let next = activeIndex;
    for (let i = 0; i < users.length; i++) {
      next = (next + dir + users.length) % users.length;
      if (!users[next].hasEmployeeProfile) break;
    }
    setActiveIndex(next);
  };

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      else moveActive(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open && activeIndex >= 0) commit(activeIndex);
      else setOpen((v) => !v);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="user-select" ref={rootRef}>
      <button
        type="button"
        id={inputId}
        className={`form-select user-select__trigger ${hasError ? 'form-input--error' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
      >
        <span className={selected ? '' : 'user-select__placeholder'}>
          {selected ? `@${selected.username} — ${selected.fullName}` : placeholder}
        </span>
        <span className="user-select__chevron" aria-hidden>{ICONS.chevronDown}</span>
      </button>

      {open && (
        <ul className="user-select__list" role="listbox" id={listboxId} ref={listRef} tabIndex={-1}>
          {users.map((u, i) => (
            <li
              key={u.id}
              role="option"
              aria-selected={u.id === value}
              aria-disabled={u.hasEmployeeProfile || undefined}
              className={
                'user-select__option' +
                (i === activeIndex ? ' is-active' : '') +
                (u.id === value ? ' is-selected' : '') +
                (u.hasEmployeeProfile ? ' is-disabled' : '')
              }
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(i)}
            >
              <span className="user-select__uname">@{u.username}</span>
              <span className="user-select__fname"> — {u.fullName}</span>
              {u.hasEmployeeProfile && <span className="user-select__tag">đã có hồ sơ</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function firstSelectable(users: AssignableUser[]): number {
  const idx = users.findIndex((u) => !u.hasEmployeeProfile);
  return idx;
}
