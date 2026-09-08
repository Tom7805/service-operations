import vi from './vi.json';

const LOCALES: Record<string, Record<string, string>> = {
  vi,
};

export function t(key: string, params?: Record<string, string | number>): string {
  const str = LOCALES.vi[key] ?? key;
  if (!params) return str;
  return Object.keys(params).reduce((s, p) => s.replace(`{${p}}`, String(params[p])), str);
}

export default { t };
