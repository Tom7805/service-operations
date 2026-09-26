import { describe, expect, it } from 'vitest';
import { computeFiscalYear, fiscalYearOf, validateCompanyForm, type CompanyForm } from '../utils/companySettingUtils';

const VALID: CompanyForm = {
  companyName: 'Công ty A',
  taxCode: '0101234567',
  address: '',
  phone: '0912345678',
  email: 'a@b.vn',
  currency: 'VND',
  fiscalYearStartMonth: 4,
  standardWorkingDaysPerMonth: '22',
};

describe('companySettingUtils (NCL-15-CN-002)', () => {
  it('chia năm tài chính bắt đầu tháng 4 giống quy ước backend', () => {
    const fy = computeFiscalYear(2026, 4);
    expect(fy.startDate).toBe('2026-04-01');
    expect(fy.endDate).toBe('2027-03-31');
    expect(fy.quarters.map((q) => [q.startDate, q.endDate])).toEqual([
      ['2026-04-01', '2026-06-30'],
      ['2026-07-01', '2026-09-30'],
      ['2026-10-01', '2026-12-31'],
      ['2027-01-01', '2027-03-31'],
    ]);
    expect(fy.months).toHaveLength(12);
    expect(fy.months[10]).toMatchObject({ period: 11, yearMonth: '2027-02', endDate: '2027-02-28' });
  });

  it('năm tài chính bắt đầu tháng 1 trùng năm dương lịch; năm nhuận tính đúng ngày cuối tháng 2', () => {
    const fy = computeFiscalYear(2028, 1);
    expect([fy.startDate, fy.endDate]).toEqual(['2028-01-01', '2028-12-31']);
    expect(fy.months[1].endDate).toBe('2028-02-29');
  });

  it('năm tài chính mang số năm dương lịch chứa ngày bắt đầu', () => {
    expect(fiscalYearOf('2027-02-15', 4)).toBe(2026);
    expect(fiscalYearOf('2026-04-01', 4)).toBe(2026);
    expect(fiscalYearOf('2026-03-31', 4)).toBe(2025);
    expect(fiscalYearOf('2026-12-31', 1)).toBe(2026);
  });

  it('kiểm tra form khớp ràng buộc backend', () => {
    expect(validateCompanyForm(VALID)).toEqual({});
    expect(validateCompanyForm({ ...VALID, taxCode: '0101234567-001' })).toEqual({});
    expect(validateCompanyForm({ ...VALID, companyName: '  ' })).toHaveProperty('companyName');
    expect(validateCompanyForm({ ...VALID, taxCode: '010123456' })).toHaveProperty('taxCode');
    expect(validateCompanyForm({ ...VALID, phone: '091234567' })).toHaveProperty('phone');
    expect(validateCompanyForm({ ...VALID, phone: '0912 345 678' })).toEqual({});
    expect(validateCompanyForm({ ...VALID, email: 'a@b' })).toHaveProperty('email');
    expect(validateCompanyForm({ ...VALID, standardWorkingDaysPerMonth: '0' })).toHaveProperty('standardWorkingDaysPerMonth');
    expect(validateCompanyForm({ ...VALID, standardWorkingDaysPerMonth: '31' })).toEqual({});
  });
});
