/**
 * Ký hiệu che dữ liệu mặc định (khớp với backend MaskingJsonSerializer.MASKED_VALUE)
 */
export const MASKED_VALUE = '***';

/**
 * Che giá trị nhạy cảm (lương/giá vốn) nếu người dùng không có quyền xem.
 * @param value Giá trị gốc cần hiển thị
 * @param canView true nếu người dùng được phép xem dữ liệu thật
 * @returns Giá trị thật nếu có quyền, ngược lại trả về ký hiệu che
 */
export function maskValue<T>(value: T, canView: boolean): T | string {
  if (canView) return value;
  return MASKED_VALUE;
}

/**
 * Kiểm tra xem một giá trị có phải là giá trị đã bị che hay không.
 */
export function isMasked(value: unknown): boolean {
  return value === MASKED_VALUE;
}