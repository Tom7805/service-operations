/**
 * Kiểm tra dữ liệu nhập + định dạng hiển thị cho danh mục dịch vụ (NCL-15-CN-001). Ràng buộc khớp
 * `ServiceCatalogReq` / `ServicePriceReq` phía backend để báo lỗi ngay trên form, không đợi 400.
 */

export const MAX_NAME = 255;
export const MAX_UNIT = 50;
export const MAX_DESCRIPTION = 1000;
export const MAX_NOTE = 500;

/** Đơn vị tính gợi ý — vẫn cho nhập tự do. */
export const UNIT_SUGGESTIONS = ['giờ', 'ngày công', 'gói', 'buổi', 'tháng', 'lần'];

export type FieldErrors = Record<string, string>;

/**
 * Đọc ô giá: bỏ khoảng trắng, chấp nhận dấu chấm phân cách hàng nghìn kiểu Việt Nam ("450.000")
 * và dấu phẩy thập phân ("450000,5"). Trả `null` nếu không phải số hợp lệ.
 */
function normalizePriceString(raw: string): string | null {
  let s = raw.replace(/\s/g, '');
  if (s === '') return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  return /^\d+(\.\d+)?$/.test(s) ? s : null;
}

export function parsePriceInput(raw: string): number | null {
  const s = normalizePriceString(raw);
  return s == null ? null : Number(s);
}

export function validatePrice(raw: string): string | null {
  if (raw.trim() === '') return 'Nhập giá dịch vụ.';
  const s = normalizePriceString(raw);
  if (s == null) return 'Giá phải là số, ví dụ 450000 hoặc 450.000.';
  if (Number(s) <= 0) return 'Giá dịch vụ phải lớn hơn 0.';
  const [intPart, frac = ''] = s.split('.');
  if (intPart.replace(/^0+(?=\d)/, '').length > 16) return 'Giá tối đa 16 chữ số phần nguyên.';
  if (frac.length > 2) return 'Giá chỉ được tối đa 2 chữ số thập phân.';
  return null;
}

export function validateDate(value: string, label = 'ngày hiệu lực'): string | null {
  if (!value) return `Chọn ${label}.`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(value).getTime())) return `${label[0].toUpperCase()}${label.slice(1)} không hợp lệ.`;
  return null;
}

export interface ServiceInfoForm {
  name: string;
  unit: string;
  description: string;
}

export function validateServiceInfo(form: ServiceInfoForm): FieldErrors {
  const errors: FieldErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Nhập tên dịch vụ.';
  else if (name.length > MAX_NAME) errors.name = `Tên dịch vụ tối đa ${MAX_NAME} ký tự.`;
  const unit = form.unit.trim();
  if (!unit) errors.unit = 'Nhập đơn vị tính.';
  else if (unit.length > MAX_UNIT) errors.unit = `Đơn vị tính tối đa ${MAX_UNIT} ký tự.`;
  if (form.description.length > MAX_DESCRIPTION) errors.description = `Mô tả tối đa ${MAX_DESCRIPTION} ký tự.`;
  return errors;
}

/**
 * Chuẩn hóa tên để so trùng giống backend (TC-02): không phân biệt hoa thường và khoảng trắng thừa,
 * nhưng GIỮ dấu ("Bảo trì" ≠ "Bao tri").
 */
export function normalizeServiceName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');
}

const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 });

export function formatVnd(value: number | null | undefined): string {
  return value == null ? '—' : VND.format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

/** Hôm nay theo giờ máy người dùng, dạng yyyy-MM-dd. */
export function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Ánh xạ tên trường backend → trường form, để lỗi `fieldErrors` hiện đúng dưới ô nhập. */
export function mapFieldErrors(fieldErrors: { field: string; message: string }[]): FieldErrors {
  const out: FieldErrors = {};
  for (const fe of fieldErrors) {
    if (!out[fe.field]) out[fe.field] = fe.message;
  }
  return out;
}
