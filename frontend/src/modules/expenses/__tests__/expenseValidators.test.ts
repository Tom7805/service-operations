import { describe, expect, it } from 'vitest';
import { validateExpenseRejectReason, validateSubcontractorExpenseForm } from '../validators/expenseValidators';

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

describe('validateSubcontractorExpenseForm (NCL-08-CN-004)', () => {
  const VALID_INPUT = {
    contractorName: 'Công ty TNHH Xây dựng ABC',
    workScope: 'Thi công phần điện nước',
    amount: '1500000',
    incurredPeriod: '2026-01-01',
  };

  it('hợp lệ khi đầy đủ dữ liệu đúng ràng buộc', () => {
    expect(validateSubcontractorExpenseForm(VALID_INPUT)).toEqual({});
  });

  it('báo lỗi khi nhà thầu rỗng hoặc quá dài', () => {
    expect(validateSubcontractorExpenseForm({ ...VALID_INPUT, contractorName: '  ' }).contractorName).toBe(
      'Nhà thầu không được để trống'
    );
    expect(
      validateSubcontractorExpenseForm({ ...VALID_INPUT, contractorName: 'a'.repeat(201) }).contractorName
    ).toBe('Tên nhà thầu không được vượt 200 ký tự');
  });

  it('báo lỗi khi phạm vi công việc rỗng hoặc quá dài', () => {
    expect(validateSubcontractorExpenseForm({ ...VALID_INPUT, workScope: '' }).workScope).toBe(
      'Phạm vi công việc không được để trống'
    );
    expect(validateSubcontractorExpenseForm({ ...VALID_INPUT, workScope: 'a'.repeat(1001) }).workScope).toBe(
      'Phạm vi công việc không được vượt 1000 ký tự'
    );
  });

  it('báo lỗi khi số tiền rỗng, không phải số hoặc không dương', () => {
    expect(validateSubcontractorExpenseForm({ ...VALID_INPUT, amount: '' }).amount).toBe(
      'Số tiền chi phí không được để trống'
    );
    expect(validateSubcontractorExpenseForm({ ...VALID_INPUT, amount: 'abc' }).amount).toBe(
      'Số tiền chi phí không được để trống'
    );
    expect(validateSubcontractorExpenseForm({ ...VALID_INPUT, amount: '0' }).amount).toBe(
      'Số tiền chi phí phải lớn hơn 0'
    );
    expect(validateSubcontractorExpenseForm({ ...VALID_INPUT, amount: '-5' }).amount).toBe(
      'Số tiền chi phí phải lớn hơn 0'
    );
  });

  it('báo lỗi khi kỳ phát sinh rỗng hoặc ở tương lai', () => {
    expect(validateSubcontractorExpenseForm({ ...VALID_INPUT, incurredPeriod: '' }).incurredPeriod).toBe(
      'Kỳ phát sinh không được để trống'
    );
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const futureIso = future.toISOString().slice(0, 10);
    expect(validateSubcontractorExpenseForm({ ...VALID_INPUT, incurredPeriod: futureIso }).incurredPeriod).toBe(
      'Kỳ phát sinh không được ở tương lai'
    );
  });
});
