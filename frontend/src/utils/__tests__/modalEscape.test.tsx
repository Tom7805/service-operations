import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackdropClick } from '../../hooks/useBackdropClick';
import { installModalEscape } from '../modalEscape';

function Dialog({ busy = false, withMenu = false }: { busy?: boolean; withMenu?: boolean }) {
  const [open, setOpen] = useState(true);
  const backdrop = useBackdropClick(() => setOpen(false), busy);
  if (!open) return <p>đã đóng</p>;
  return (
    <div className="modal-backdrop" onMouseDown={backdrop.onMouseDown} onClick={backdrop.onClick}>
      <div className="modal-card">
        <input aria-label="Tên" />
        {withMenu && <div role="menu">menu đang mở</div>}
      </div>
    </div>
  );
}

describe('installModalEscape', () => {
  let uninstall: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    uninstall = installModalEscape();
  });
  afterEach(() => {
    uninstall();
    vi.useRealTimers();
  });

  const pressEscape = () => {
    fireEvent.keyDown(screen.getByLabelText('Tên'), { key: 'Escape' });
    act(() => {
      vi.runAllTimers();
    });
  };

  it('Esc đóng hộp thoại như bấm vào nền mờ', () => {
    render(<Dialog />);
    pressEscape();
    expect(screen.getByText('đã đóng')).toBeInTheDocument();
  });

  it('hộp thoại đang lưu (khoá bấm nền) thì Esc cũng không đóng', () => {
    render(<Dialog busy />);
    pressEscape();
    expect(screen.queryByText('đã đóng')).not.toBeInTheDocument();
  });

  it('đang mở menu bên trong thì Esc chỉ dành cho menu, hộp thoại giữ nguyên', () => {
    render(<Dialog withMenu />);
    pressEscape();
    expect(screen.queryByText('đã đóng')).not.toBeInTheDocument();
  });
});
