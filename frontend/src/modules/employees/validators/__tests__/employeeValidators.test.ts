import { describe, it, expect } from 'vitest';
import { validateCreateEmployee, validateUpdateEmployee, validateContractForm } from '../employeeValidators';

describe('validateCreateEmployee (NCL-01-CN-007)', () => {
  it('yêu cầu phải chọn tài khoản nhân viên', () => {
    const errors = validateCreateEmployee({ hireDate: '2026-01-01' });
    expect(errors.userId).toBeDefined();
  });

  it('yêu cầu ngày vào làm không được để trống', () => {
    const errors = validateCreateEmployee({ userId: 5 });
    expect(errors.hireDate).toBeDefined();
  });

  it('TC-03: từ chối khi ngày kết thúc sớm hơn ngày vào làm', () => {
    const errors = validateCreateEmployee({
      userId: 5,
      hireDate: '2026-06-01',
      endDate: '2026-01-01',
    });
    expect(errors.endDate).toBeDefined();
  });

  it('chấp nhận khi ngày kết thúc bằng hoặc sau ngày vào làm', () => {
    const errors = validateCreateEmployee({
      userId: 5,
      hireDate: '2026-01-01',
      endDate: '2026-01-01',
    });
    expect(errors.endDate).toBeUndefined();
  });

  it('TC-01/TC-02: cho phép để trống standardHoursPerWeek (sẽ mặc định 40 ở backend)', () => {
    const errors = validateCreateEmployee({ userId: 5, hireDate: '2026-01-01' });
    expect(errors.standardHoursPerWeek).toBeUndefined();
  });

  it('TC-01/TC-02: từ chối standardHoursPerWeek <= 0 khi có nhập', () => {
    const errors = validateCreateEmployee({ userId: 5, hireDate: '2026-01-01', standardHoursPerWeek: 0 });
    expect(errors.standardHoursPerWeek).toBeDefined();
  });

  it('TC-01/TC-02: chấp nhận standardHoursPerWeek tùy chỉnh khác 40 (không ép về 40)', () => {
    const errors = validateCreateEmployee({ userId: 5, hireDate: '2026-01-01', standardHoursPerWeek: 20 });
    expect(errors.standardHoursPerWeek).toBeUndefined();
  });
});

describe('validateUpdateEmployee (NCL-01-CN-007)', () => {
  it('không yêu cầu userId (không đổi được tài khoản khi sửa)', () => {
    const errors = validateUpdateEmployee({ hireDate: '2026-01-01' });
    expect(errors).not.toHaveProperty('userId');
  });

  it('TC-03: từ chối khi ngày kết thúc sớm hơn ngày vào làm', () => {
    const errors = validateUpdateEmployee({ hireDate: '2026-06-01', endDate: '2026-01-01' });
    expect(errors.endDate).toBeDefined();
  });
});

describe('validateContractForm (NCL-01-CN-007)', () => {
  it('yêu cầu phải chọn loại hợp đồng và ngày bắt đầu', () => {
    const errors = validateContractForm({});
    expect(errors.contractType).toBeDefined();
    expect(errors.startDate).toBeDefined();
  });

  it('TC-03: từ chối khi ngày kết thúc hợp đồng sớm hơn ngày bắt đầu', () => {
    const errors = validateContractForm({
      contractType: 'PART_TIME',
      startDate: '2026-06-01',
      endDate: '2026-01-01',
    });
    expect(errors.endDate).toBeDefined();
  });

  it('chấp nhận hợp đồng hợp lệ không có ngày kết thúc', () => {
    const errors = validateContractForm({ contractType: 'FULL_TIME', startDate: '2026-01-01' });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});
