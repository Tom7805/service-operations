/**
 * Tùy chọn giao diện của người dùng (Cài đặt › Giao diện): chủ đề, mật độ hiển thị, màn hình mở đầu,
 * thanh bên thu gọn, giảm hiệu ứng.
 *
 * Nguồn chính là máy chủ (GET/PUT /me/preferences — đi theo tài khoản sang máy khác). Bản sao trong
 * localStorage chỉ để áp NGAY khi mở trang, trước khi React vẽ gì (không nháy trắng khi dùng giao diện
 * tối) và để trang đăng nhập giữ đúng chủ đề của lần dùng trước trên máy này.
 */
export type ThemeMode = 'LIGHT' | 'DARK' | 'SYSTEM';
export type Density = 'COMFORTABLE' | 'COMPACT';

export interface UiPreferences {
  theme: ThemeMode;
  density: Density;
  /** Mã màn hình mở đầu sau đăng nhập; null = mặc định theo vai trò. */
  landingTab: string | null;
  sidebarCollapsed: boolean;
  reduceMotion: boolean;
}

export const DEFAULT_PREFERENCES: UiPreferences = {
  theme: 'LIGHT',
  density: 'COMFORTABLE',
  landingTab: null,
  sidebarCollapsed: false,
  reduceMotion: false,
};

const CACHE_KEY = 'ui-preferences';
/** Khóa cũ của nút thu gọn thanh bên (trước khi có Cài đặt) — đọc một lần để không mất lựa chọn cũ. */
const LEGACY_SIDEBAR_KEY = 'sidebarCollapsed';

const THEMES: ThemeMode[] = ['LIGHT', 'DARK', 'SYSTEM'];
const DENSITIES: Density[] = ['COMFORTABLE', 'COMPACT'];

/** Chuẩn hóa dữ liệu lạ (bản lưu cũ, máy chủ trả thiếu trường) về đúng kiểu, thiếu thì lấy mặc định. */
export function normalizePreferences(raw: Partial<Record<keyof UiPreferences, unknown>> | null | undefined): UiPreferences {
  const src = raw ?? {};
  return {
    theme: THEMES.includes(src.theme as ThemeMode) ? (src.theme as ThemeMode) : DEFAULT_PREFERENCES.theme,
    density: DENSITIES.includes(src.density as Density) ? (src.density as Density) : DEFAULT_PREFERENCES.density,
    landingTab: typeof src.landingTab === 'string' && /^[A-Z_]{1,40}$/.test(src.landingTab) ? src.landingTab : null,
    sidebarCollapsed: typeof src.sidebarCollapsed === 'boolean' ? src.sidebarCollapsed : DEFAULT_PREFERENCES.sidebarCollapsed,
    reduceMotion: typeof src.reduceMotion === 'boolean' ? src.reduceMotion : DEFAULT_PREFERENCES.reduceMotion,
  };
}

export function readCachedPreferences(): UiPreferences {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return normalizePreferences(JSON.parse(raw));
    const legacySidebar = localStorage.getItem(LEGACY_SIDEBAR_KEY);
    return { ...DEFAULT_PREFERENCES, sidebarCollapsed: legacySidebar === '1' };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function cachePreferences(prefs: UiPreferences): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(prefs));
  } catch {
    // Trình duyệt chặn lưu (chế độ riêng tư…) — vẫn chạy bình thường, chỉ không nhớ qua lần tải sau.
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

/** Chủ đề thực sự hiển thị: "Theo hệ thống" đổi theo cài đặt Sáng/Tối của hệ điều hành. */
export function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'SYSTEM') return systemPrefersDark() ? 'dark' : 'light';
  return theme === 'DARK' ? 'dark' : 'light';
}

/** Gắn tùy chọn lên <html> — toàn bộ CSS đọc từ các thuộc tính data-* này. */
export function applyPreferences(prefs: UiPreferences, root: HTMLElement = document.documentElement): void {
  const theme = resolveTheme(prefs.theme);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.dataset.density = prefs.density === 'COMPACT' ? 'compact' : 'comfortable';
  if (prefs.reduceMotion) root.dataset.motion = 'reduce';
  else delete root.dataset.motion;
}

/** Theo dõi hệ điều hành đổi Sáng/Tối (chỉ có tác dụng khi chọn "Theo hệ thống"). */
export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
