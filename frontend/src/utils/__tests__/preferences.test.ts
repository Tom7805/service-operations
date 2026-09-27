import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyPreferences,
  cachePreferences,
  DEFAULT_PREFERENCES,
  normalizePreferences,
  readCachedPreferences,
  resolveTheme,
} from '../preferences';

function mockSystemDark(dark: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: dark,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
}

describe('preferences', () => {
  const originalMatchMedia = window.matchMedia;
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    const root = document.documentElement;
    delete root.dataset.theme;
    delete root.dataset.density;
    delete root.dataset.motion;
  });

  it('dữ liệu lạ hoặc thiếu trường được đưa về mặc định; mã màn hình mở đầu sai định dạng bị bỏ', () => {
    expect(normalizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(normalizePreferences({ theme: 'PURPLE', density: 'COMPACT', landingTab: '<b>', sidebarCollapsed: 'yes' })).toEqual({
      ...DEFAULT_PREFERENCES,
      density: 'COMPACT',
    });
  });

  it('đọc lại bản đã lưu trên máy; chưa có thì nhớ lựa chọn thu gọn thanh bên kiểu cũ', () => {
    localStorage.setItem('sidebarCollapsed', '1');
    expect(readCachedPreferences().sidebarCollapsed).toBe(true);
    cachePreferences({ ...DEFAULT_PREFERENCES, theme: 'DARK', landingTab: 'PROJECTS' });
    expect(readCachedPreferences()).toMatchObject({ theme: 'DARK', landingTab: 'PROJECTS' });
  });

  it('"Theo hệ thống" đổi theo Sáng/Tối của hệ điều hành', () => {
    mockSystemDark(true);
    expect(resolveTheme('SYSTEM')).toBe('dark');
    mockSystemDark(false);
    expect(resolveTheme('SYSTEM')).toBe('light');
    expect(resolveTheme('DARK')).toBe('dark');
  });

  it('gắn chủ đề, mật độ, giảm hiệu ứng lên <html> để CSS đọc', () => {
    mockSystemDark(false);
    applyPreferences({ ...DEFAULT_PREFERENCES, theme: 'DARK', density: 'COMPACT', reduceMotion: true });
    const root = document.documentElement;
    expect(root.dataset.theme).toBe('dark');
    expect(root.dataset.density).toBe('compact');
    expect(root.dataset.motion).toBe('reduce');
    applyPreferences(DEFAULT_PREFERENCES);
    expect(root.dataset.theme).toBe('light');
    expect(root.dataset.motion).toBeUndefined();
  });
});
