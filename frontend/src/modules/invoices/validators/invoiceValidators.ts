/**
 * Bộ kiểm tra hợp lệ phía client cho các biểu mẫu Hóa đơn (NCL-10).
 */

export interface PaymentFormInput {
  amount: string | number;
  paymentDate: string;
  method: string;
}

/**
 * Kiểm tra hợp lệ biểu mẫu ghi nhận thanh toán (NCL-10-CN-003):
 * - Số tiền bắt buộc, > 0, không vượt số tiền còn lại của hóa đơn.
 * - Ngày thanh toán bắt buộc, không được ở tương lai (khớp rule backend).
 * - Phương thức thanh toán bắt buộc.
 */
export function validatePaymentForm(
  input: PaymentFormInput,
  remainingAmount: number
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const amount = input.amount === '' || input.amount === null || input.amount === undefined
    ? NaN
    : Number(input.amount);

  if (Number.isNaN(amount)) {
    errors.amount = 'Số tiền không được để trống';
  } else if (amount <= 0) {
    errors.amount = 'Số tiền phải lớn hơn 0';
  } else if (amount > remainingAmount) {
    errors.amount = `Số tiền không được vượt quá số còn lại (${remainingAmount.toLocaleString('vi-VN')} đ)`;
  }

  if (!input.paymentDate || !input.paymentDate.trim()) {
    errors.paymentDate = 'Ngày thanh toán không được để trống';
  } else if (new Date(input.paymentDate) > new Date()) {
    errors.paymentDate = 'Ngày thanh toán không được ở tương lai';
  }

  if (!input.method) {
    errors.method = 'Chọn phương thức thanh toán';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export interface ProposalFormInput {
  periodFrom: string;
  periodTo: string;
}

/** Kiểm tra hợp lệ biểu mẫu đề xuất hóa đơn (NCL-10-CN-001): cả hai ngày bắt buộc,
 *  ngày kết thúc kỳ không được sớm hơn ngày bắt đầu kỳ. */
export function validateProposalForm(input: ProposalFormInput): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input.periodFrom) errors.periodFrom = 'Ngày bắt đầu kỳ không được để trống';
  if (!input.periodTo) errors.periodTo = 'Ngày kết thúc kỳ không được để trống';
  if (input.periodFrom && input.periodTo && new Date(input.periodTo) < new Date(input.periodFrom)) {
    errors.periodTo = 'Ngày kết thúc kỳ không được sớm hơn ngày bắt đầu kỳ';
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

export interface RecurringScheduleFormInput {
  billingDayOfMonth: string | number;
  amount: string | number;
}

/** Kiểm tra hợp lệ biểu mẫu lịch hóa đơn định kỳ (NCL-10-CN-005): ngày lập hóa đơn
 *  trong tháng 1-28 (tránh tháng 2/tháng thiếu), số tiền > 0. */
export function validateRecurringScheduleForm(
  input: RecurringScheduleFormInput
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const day = input.billingDayOfMonth === '' ? NaN : Number(input.billingDayOfMonth);
  const amount = input.amount === '' ? NaN : Number(input.amount);

  if (Number.isNaN(day)) {
    errors.billingDayOfMonth = 'Ngày lập hóa đơn hàng tháng không được để trống';
  } else if (day < 1 || day > 28) {
    errors.billingDayOfMonth = 'Ngày lập hóa đơn hàng tháng phải từ 1 đến 28';
  }

  if (Number.isNaN(amount)) {
    errors.amount = 'Số tiền không được để trống';
  } else if (amount <= 0) {
    errors.amount = 'Số tiền phải lớn hơn 0';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
