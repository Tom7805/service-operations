/**
 * Kiểm tra lý do từ chối phiếu chi phí (NCL-08-CN-002).
 * Khớp ràng buộc backend `ExpenseRejectReq`: bắt buộc, tối đa 1000 ký tự — thiếu nhận
 * `400 VALIDATION_ERROR` trước khi backend chạm tới phiếu chi phí.
 */
export function validateExpenseRejectReason(reason: string): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) return 'Lý do từ chối không được để trống';
  if (trimmed.length > 1000) return 'Lý do từ chối không được vượt 1000 ký tự';
  return undefined;
}
