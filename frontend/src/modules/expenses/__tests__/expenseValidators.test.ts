import { describe, expect, it } from 'vitest';
import { validateExpenseRejectReason } from '../validators/expenseValidators';

describe('validateExpenseRejectReason (NCL-08-CN-002)', () => {
  it('báo lỗi khi lý do rỗng', () => {
    expect(validateExpenseRejectReason('')).toBe('Lý do từ chối không được để trống');
    expect(validateExpenseRejectReason('   ')).toBe('Lý do từ chối không được để trống');
  });

  it('báo lỗi khi lý do vượt quá 1000 ký tự', () => {
    const tooLong = 'a'.repeat(1001);
    expect(validateExpenseRejectReason(tooLong)).toBe('Lý do từ chối không được vượt 1000 ký tự');
  });

  it('hợp lệ khi có lý do trong giới hạn', () => {
    expect(validateExpenseRejectReason('Thiếu chứng từ hợp lệ')).toBeUndefined();
    expect(validateExpenseRejectReason('a'.repeat(1000))).toBeUndefined();
  });
});
