import { describe, it, expect } from 'vitest';
import { canViewSensitiveData, SENSITIVE_DATA_ROLES } from '../usePermission';

describe('canViewSensitiveData (NCL-01-CN-005, QTN-02)', () => {
  it('cho phép Ban giám đốc (VT-01) xem dữ liệu nhạy cảm', () => {
    expect(canViewSensitiveData(['VT-01'])).toBe(true);
  });

  it('cho phép Kế toán (VT-05) xem dữ liệu nhạy cảm', () => {
    expect(canViewSensitiveData(['VT-05'])).toBe(true);
  });

  it('cho phép Nhân sự (VT-06) xem dữ liệu nhạy cảm', () => {
    expect(canViewSensitiveData(['VT-06'])).toBe(true);
  });

  it('từ chối Quản lý dự án (VT-02) và các vai trò khác', () => {
    expect(canViewSensitiveData(['VT-02'])).toBe(false);
    expect(canViewSensitiveData(['VT-03'])).toBe(false);
    expect(canViewSensitiveData(['VT-07'])).toBe(false);
  });

  it('cho phép khi tài khoản có nhiều vai trò và ít nhất một vai trò được phép', () => {
    expect(canViewSensitiveData(['VT-02', 'VT-06'])).toBe(true);
  });

  it('từ chối khi không có vai trò nào', () => {
    expect(canViewSensitiveData([])).toBe(false);
    expect(canViewSensitiveData(undefined)).toBe(false);
  });

  it('danh sách vai trò được phép khớp đúng với backend (DataMaskingServiceImpl)', () => {
    expect(SENSITIVE_DATA_ROLES).toEqual(['VT-01', 'VT-05', 'VT-06']);
  });
});
