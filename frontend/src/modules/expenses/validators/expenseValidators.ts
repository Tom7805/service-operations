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
 * Các lỗi validate form ghi nhận chi phí dự án (NCL-08-CN-001), khớp ràng buộc backend
 * `ExpenseCreateReq` — dùng chung cho tạo mới và sửa/nộp lại phiếu bị từ chối.
 */
export interface ExpenseFormErrors {
  type?: string;
  amount?: string;
  expenseDate?: string;
  description?: string;
  receiptUrl?: string;
}

export function validateExpenseForm(input: {
  type: string;
  amount: string;
  expenseDate: string;
  description: string;
  receiptUrl: string;
}): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {};

  if (!input.type) errors.type = 'Loại chi phí không được để trống';

  const amount = Number(input.amount);
  if (!input.amount.trim() || Number.isNaN(amount)) errors.amount = 'Số tiền chi phí không được để trống';
  else if (amount <= 0) errors.amount = 'Số tiền chi phí phải lớn hơn 0';

  if (!input.expenseDate) {
    errors.expenseDate = 'Ngày phát sinh không được để trống';
  } else if (Number.isNaN(new Date(input.expenseDate).getTime())) {
    errors.expenseDate = 'Ngày phát sinh không hợp lệ';
  } else {
    // So sánh chuỗi YYYY-MM-DD theo giờ địa phương, tránh lệch múi giờ so với UTC.
    const todayIso = new Date().toLocaleDateString('en-CA');
    if (input.expenseDate > todayIso) errors.expenseDate = 'Ngày phát sinh không được ở tương lai';
  }

  const description = input.description.trim();
  if (!description) errors.description = 'Mô tả chi phí không được để trống';
  else if (description.length > 1000) errors.description = 'Mô tả chi phí không được vượt 1000 ký tự';

  if (input.receiptUrl.trim().length > 500) errors.receiptUrl = 'Đường dẫn chứng từ không được vượt 500 ký tự';

  return errors;
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

/**
 * Các lỗi validate form phân bổ chi phí chung (NCL-08-CN-005), khớp ràng buộc backend
 * `OverheadAllocationRunReq`. Không giới hạn năm ở tương lai — Kế toán có thể cần khai
 * báo trước cho kỳ sắp tới, backend tự từ chối nếu kỳ đó chưa có giờ công được duyệt.
 */
export interface OverheadAllocationFormErrors {
  year?: string;
  month?: string;
  totalAmount?: string;
}

export function validateOverheadAllocationForm(input: {
  year: string;
  month: string;
  totalAmount: string;
}): OverheadAllocationFormErrors {
  const errors: OverheadAllocationFormErrors = {};

  const year = Number(input.year);
  if (!input.year.trim() || !Number.isInteger(year)) errors.year = 'Năm không được để trống';
  else if (year < 2000 || year > 2100) errors.year = 'Năm không hợp lệ';

  const month = Number(input.month);
  if (!input.month.trim() || !Number.isInteger(month)) errors.month = 'Tháng không được để trống';
  else if (month < 1 || month > 12) errors.month = 'Tháng phải từ 1 đến 12';

  const totalAmount = Number(input.totalAmount);
  if (!input.totalAmount.trim() || Number.isNaN(totalAmount)) {
    errors.totalAmount = 'Tổng chi phí chung không được để trống';
  } else if (totalAmount <= 0) {
    errors.totalAmount = 'Tổng chi phí chung phải lớn hơn 0';
  }

  return errors;
}
