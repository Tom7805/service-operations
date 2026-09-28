import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAST_ACTIVITY_KEY, markActivity, useIdleLogout } from '../useIdleLogout';

const TIMEOUT = 60_000;

describe('useIdleLogout (NCL-01-CN-001-TC-03)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-26T08:00:00'));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('không thao tác quá thời gian cho phép thì gọi onIdle', () => {
    markActivity();
    const onIdle = vi.fn();
    renderHook(() => useIdleLogout({ enabled: true, onIdle, timeoutMs: TIMEOUT }));

    vi.advanceTimersByTime(TIMEOUT + 15_000);

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('người dùng vẫn thao tác thì phiên không bị kết thúc', () => {
    markActivity();
    const onIdle = vi.fn();
    renderHook(() => useIdleLogout({ enabled: true, onIdle, timeoutMs: TIMEOUT }));

    for (let i = 0; i < 6; i += 1) {
      vi.advanceTimersByTime(20_000);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    }

    expect(onIdle).not.toHaveBeenCalled();
  });

  it('mở lại trình duyệt khi lần thao tác cuối đã quá hạn thì đăng xuất ngay', () => {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now() - TIMEOUT * 2));
    const onIdle = vi.fn();
    renderHook(() => useIdleLogout({ enabled: true, onIdle, timeoutMs: TIMEOUT }));

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('chưa đăng nhập thì không theo dõi', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleLogout({ enabled: false, onIdle, timeoutMs: TIMEOUT }));

    vi.advanceTimersByTime(TIMEOUT * 3);

    expect(onIdle).not.toHaveBeenCalled();
  });
});
