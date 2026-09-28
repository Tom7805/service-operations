/** Hôm nay theo giờ máy người dùng, dạng `yyyy-MM-dd` (so sánh chuỗi được với `effectiveFrom`). */
export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Đơn giá có hiệu lực SAU hôm nay. So sánh chuỗi `yyyy-MM-dd` thay vì `new Date('yyyy-MM-dd')` — cách cũ đọc
 * chuỗi theo giờ UTC nên ở Việt Nam (UTC+7) dòng có hiệu lực đúng hôm nay bị gắn nhầm "Sắp hiệu lực".
 */
export function isFutureIso(effectiveFrom: string): boolean {
  return effectiveFrom > todayIso();
}

/** `yyyy-MM-dd` → `d/M/yyyy` (như `toLocaleDateString('vi-VN')`), không qua múi giờ. */
export function formatIsoDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : value;
}

export function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

/** Ô nhập tiền: hiện dấu chấm ngăn hàng nghìn khi gõ, lưu về số thường. */
export function formatVnNumber(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '';
  return value.toLocaleString('vi-VN');
}

export function parseVnNumber(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? null : Number(digits);
}

/**
 * `edit`: dòng chưa áp dụng trước hôm nay → sửa thẳng (PUT).
 * `newVersion`: dòng đã áp dụng từ trước → ghi một mức mới từ ngày được chọn (POST), mức cũ giữ nguyên cho
 * giai đoạn trước — doanh thu tính lại theo đơn giá tại ngày công nên sửa đè sẽ làm đổi số các kỳ đã chốt.
 */
export type RateEditMode = 'edit' | 'newVersion';

export function rateEditMode(effectiveFrom: string): RateEditMode {
  return effectiveFrom >= todayIso() ? 'edit' : 'newVersion';
}
