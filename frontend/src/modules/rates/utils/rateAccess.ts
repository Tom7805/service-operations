/** Khu "Đơn giá" chỉ dành cho Kế toán (VT-05) và Quản trị viên (VT-07) — backend cũng chặn đúng hai vai trò này. */
export function canManageRates(roles: string[]): boolean {
  return roles.includes('VT-05') || roles.includes('VT-07');
}
