/**
 * Bộ kiểm tra hợp lệ phía client cho các biểu mẫu hợp đồng (NCL-04).
 */

export interface RenewalFormInput {
  newEndDate: string;
  additionalValue: string | number;
  notes?: string;
}

export interface RenewalValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  valueAfter: number;
}

/**
 * Kiểm tra hợp lệ biểu mẫu gia hạn hợp đồng (NCL-04-CN-007):
 * - TC-01/TC-03: Ngày kết thúc mới bắt buộc và phải sau ngày kết thúc hiện tại.
 * - TC-03: Giá trị bổ sung không được âm.
 * - QTN-19: Giá trị sau gia hạn không được vượt hạn mức trần (limitValue).
 */
export function validateRenewalForm(
  input: RenewalFormInput,
  currentEndDate?: string | null,
  currentTotalValue: number = 0,
  limitValue?: number | null
): RenewalValidationResult {
  const errors: Record<string, string> = {};
  const additional = input.additionalValue === '' || input.additionalValue === null || input.additionalValue === undefined
    ? 0
    : Number(input.additionalValue);

  if (!input.newEndDate || !input.newEndDate.trim()) {
    errors.newEndDate = 'Ngày kết thúc mới không được để trống';
  } else if (currentEndDate) {
    const prevDate = new Date(currentEndDate);
    const nextDate = new Date(input.newEndDate.trim());
    if (nextDate <= prevDate) {
      errors.newEndDate = 'Ngày kết thúc mới phải sau ngày kết thúc hiện tại của hợp đồng';
    }
  }

  if (Number.isNaN(additional)) {
    errors.additionalValue = 'Giá trị bổ sung phải là số hợp lệ';
  } else if (additional < 0) {
    errors.additionalValue = 'Giá trị bổ sung không được âm';
  }

  const valueAfter = currentTotalValue + (Number.isNaN(additional) || additional < 0 ? 0 : additional);

  if (limitValue !== null && limitValue !== undefined && limitValue > 0 && additional > 0) {
    if (valueAfter > limitValue) {
      errors.additionalValue = `Tổng giá trị sau gia hạn (${valueAfter.toLocaleString('vi-VN')} đ) vượt quá hạn mức cho phép (${limitValue.toLocaleString('vi-VN')} đ)`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    valueAfter,
  };
}
