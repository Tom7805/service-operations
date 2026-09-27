export function formatPortalMoney(value?: number | string | null): string {
  if (value == null || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫` : String(value);
}

export function formatPortalDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN');
}
