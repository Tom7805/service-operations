import { describe, expect, it } from 'vitest';
import {
  validateExpenseRejectReason,
  validateOverheadAllocationForm,
  validateSubcontractorExpenseForm,
} from '../validators/expenseValidators';

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

describe('validateOverheadAllocationForm (NCL-08-CN-005)', () => {
  const VALID_INPUT = { year: '2026', month: '6', totalAmount: '50000000' };

  it('hợp lệ khi đầy đủ dữ liệu đúng ràng buộc', () => {
    expect(validateOverheadAllocationForm(VALID_INPUT)).toEqual({});
  });

  it('báo lỗi khi năm rỗng hoặc ngoài khoảng hợp lệ', () => {
    expect(validateOverheadAllocationForm({ ...VALID_INPUT, year: '' }).year).toBe('Năm không được để trống');
    expect(validateOverheadAllocationForm({ ...VALID_INPUT, year: '1999' }).year).toBe('Năm không hợp lệ');
  });

  it('báo lỗi khi tháng rỗng hoặc ngoài khoảng 1-12', () => {
    expect(validateOverheadAllocationForm({ ...VALID_INPUT, month: '' }).month).toBe('Tháng không được để trống');
    expect(validateOverheadAllocationForm({ ...VALID_INPUT, month: '0' }).month).toBe('Tháng phải từ 1 đến 12');
    expect(validateOverheadAllocationForm({ ...VALID_INPUT, month: '13' }).month).toBe('Tháng phải từ 1 đến 12');
  });

  it('báo lỗi khi tổng chi phí chung rỗng, không phải số hoặc không dương', () => {
    expect(validateOverheadAllocationForm({ ...VALID_INPUT, totalAmount: '' }).totalAmount).toBe(
      'Tổng chi phí chung không được để trống'
    );
    expect(validateOverheadAllocationForm({ ...VALID_INPUT, totalAmount: 'abc' }).totalAmount).toBe(
      'Tổng chi phí chung không được để trống'
    );
    expect(validateOverheadAllocationForm({ ...VALID_INPUT, totalAmount: '0' }).totalAmount).toBe(
      'Tổng chi phí chung phải lớn hơn 0'
    );
    expect(validateOverheadAllocationForm({ ...VALID_INPUT, totalAmount: '-100' }).totalAmount).toBe(
      'Tổng chi phí chung phải lớn hơn 0'
    );
  });
});
