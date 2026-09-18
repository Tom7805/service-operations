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

/**
 * Các lỗi validate form ghi nhận chi phí thuê ngoài (NCL-08-CN-004), khớp ràng buộc backend
 * `SubcontractorExpenseReq` — kiểm tra trước khi gọi API để tránh round-trip cho lỗi rõ ràng.
 */
export interface SubcontractorExpenseFormErrors {
  contractorName?: string;
  workScope?: string;
  amount?: string;
  incurredPeriod?: string;
}

export function validateSubcontractorExpenseForm(input: {
  contractorName: string;
  workScope: string;
  amount: string;
  incurredPeriod: string;
}): SubcontractorExpenseFormErrors {
  const errors: SubcontractorExpenseFormErrors = {};

  const contractorName = input.contractorName.trim();
  if (!contractorName) errors.contractorName = 'Nhà thầu không được để trống';
  else if (contractorName.length > 200) errors.contractorName = 'Tên nhà thầu không được vượt 200 ký tự';

  const workScope = input.workScope.trim();
  if (!workScope) errors.workScope = 'Phạm vi công việc không được để trống';
  else if (workScope.length > 1000) errors.workScope = 'Phạm vi công việc không được vượt 1000 ký tự';

  const amount = Number(input.amount);
  if (!input.amount.trim() || Number.isNaN(amount)) errors.amount = 'Số tiền chi phí không được để trống';
  else if (amount <= 0) errors.amount = 'Số tiền chi phí phải lớn hơn 0';

  if (!input.incurredPeriod) {
    errors.incurredPeriod = 'Kỳ phát sinh không được để trống';
  } else if (Number.isNaN(new Date(input.incurredPeriod).getTime())) {
    errors.incurredPeriod = 'Kỳ phát sinh không hợp lệ';
  } else {
    // So sánh chuỗi YYYY-MM-DD thay vì đối tượng Date để tránh lệch múi giờ khi input
    // (từ <input type="date">) là ngày theo lịch địa phương còn `new Date()` là UTC.
    const todayIso = new Date().toLocaleDateString('en-CA');
    if (input.incurredPeriod > todayIso) errors.incurredPeriod = 'Kỳ phát sinh không được ở tương lai';
  }

  return errors;
}
