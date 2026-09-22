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
