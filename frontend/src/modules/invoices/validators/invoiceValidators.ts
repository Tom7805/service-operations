/**
 * Bộ kiểm tra hợp lệ phía client cho các biểu mẫu Hóa đơn (NCL-10).
 */

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
