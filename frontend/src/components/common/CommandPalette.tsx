import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface CommandItem {
  /** Khóa duy nhất, cũng là giá trị trả về khi người dùng chọn. */
  id: string;
  /** Nhãn hiển thị. */
  label: string;
  /** Nhóm để gom mục trong danh sách (ví dụ "Điều hướng", "Bảo mật & hệ thống"). */
  group: string;
  icon?: React.ReactNode;
  /** Từ khóa phụ giúp tìm thấy mục mà không cần gõ đúng nhãn. */
  keywords?: string;
}

interface CommandPaletteProps {
  items: CommandItem[];
  onSelect: (id: string) => void;
}

/** Bỏ dấu tiếng Việt để "tai khoan" cũng tìm ra "Tài khoản" — người dùng gõ nhanh
 *  thường không bỏ dấu, và bắt họ gõ đúng dấu là tự dựng rào cản. */
function khongDau(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Bảng lệnh (Ctrl/⌘ + K) — nhảy tới bất kỳ màn hình nào mà không phải rời tay khỏi bàn phím.
 *
 * Vì sao cần: hệ này có 10 đích đến và người dùng thao tác lặp lại hằng ngày. Bắt họ rê chuột
 * qua sidebar mỗi lần chuyển việc là chi phí cộng dồn rất lớn. Đây là cải tiến trải nghiệm có
 * giá trị cao nhất cho một công cụ vận hành, và cũng là thứ phân biệt phần mềm nội bộ được
 * chăm chút với phần mềm nội bộ làm cho xong.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ items, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /** Nhớ phần tử đang focus trước khi mở, để trả con trỏ về đúng chỗ khi đóng. */
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const results = useMemo(() => {
    const q = khongDau(query.trim());
    if (!q) return items;
    return items.filter((it) => khongDau(`${it.label} ${it.group} ${it.keywords ?? ''}`).includes(q));
  }, [items, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
    restoreFocusRef.current?.focus();
  }, []);

  const choose = useCallback(
    (id: string) => {
      onSelect(id);
      close();
    },
    [onSelect, close]
  );

  // Phím tắt mở bảng lệnh — đăng ký ở cấp document nên bấm được từ bất kỳ đâu.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        restoreFocusRef.current = document.activeElement as HTMLElement;
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Mỗi lần lọc lại thì đưa lựa chọn về mục đầu, tránh trỏ vào mục đã biến mất.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Cuộn mục đang chọn vào tầm nhìn khi di chuyển bằng phím mũi tên.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) choose(target.id);
    }
  };

  // Gom theo nhóm nhưng vẫn giữ chỉ số phẳng, để phím mũi tên chạy xuyên suốt các nhóm.
  const groups: Array<{ name: string; entries: Array<{ item: CommandItem; index: number }> }> = [];
  results.forEach((item, index) => {
    const last = groups[groups.length - 1];
    if (last && last.name === item.group) last.entries.push({ item, index });
    else groups.push({ name: item.group, entries: [{ item, index }] });
  });

  return (
    <div className="cmdk-backdrop" onMouseDown={close} role="presentation">
      <div
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="Bảng lệnh"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="cmdk__field">
          <input
            ref={inputRef}
            className="cmdk__input"
            placeholder="Đi tới màn hình…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Tìm màn hình"
            aria-controls="cmdk-list"
            autoComplete="off"
          />
          <kbd className="cmdk__kbd">ESC</kbd>
        </div>

        <div className="cmdk__list" id="cmdk-list" ref={listRef} role="listbox">
          {results.length === 0 ? (
            <p className="cmdk__empty">
              Không có màn hình nào khớp với <strong>“{query}”</strong>.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.name} className="cmdk__group">
                <div className="cmdk__group-label">{group.name}</div>
                {group.entries.map(({ item, index }) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    data-active={index === activeIndex}
                    className="cmdk__item"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(item.id)}
                  >
                    {item.icon && <span className="cmdk__item-icon">{item.icon}</span>}
                    <span className="cmdk__item-label">{item.label}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="cmdk__footer">
          <span><kbd className="cmdk__kbd">↑</kbd><kbd className="cmdk__kbd">↓</kbd> di chuyển</span>
          <span><kbd className="cmdk__kbd">↵</kbd> mở</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
