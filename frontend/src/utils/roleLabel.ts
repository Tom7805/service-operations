/**
 * Ánh xạ mã vai trò nội bộ (VT-xx) sang tên tiếng Việt để hiển thị.
 *
 * Giao diện KHÔNG hiển thị mã vai trò cho người dùng — luôn đi qua {@link roleLabel}
 * hoặc {@link roleLabels}. Mã vai trò chỉ dùng trong logic phân quyền và dữ liệu.
 * Khớp bảng `roles` phía backend / seed `R__seed_departments.sql`.
 */
export const ROLE_LABELS: Record<string, string> = {
  'VT-01': 'Ban giám đốc',
  'VT-02': 'Quản lý dự án',
  'VT-03': 'Nhân viên chuyên môn',
  'VT-04': 'Nhân viên kinh doanh',
  'VT-05': 'Kế toán',
  'VT-06': 'Nhân sự',
  'VT-07': 'Quản trị viên',
  'VT-08': 'Nhân viên công ty',
  'VT-09': 'Khách hàng',
};

/** Tên vai trò dễ đọc; mã lạ trả về chính mã; null/rỗng -> ''. */
export function roleLabel(code: string | null | undefined): string {
  if (!code) return '';
  return ROLE_LABELS[code] ?? code;
}

/** Danh sách mã vai trò -> chuỗi tên đã nối, ví dụ "Quản lý dự án, Nhân viên kinh doanh". */
export function roleLabels(
  codes: readonly string[] | null | undefined,
  separator = ', ',
): string {
  if (!codes || codes.length === 0) return '';
  return codes.map(roleLabel).filter(Boolean).join(separator);
}
