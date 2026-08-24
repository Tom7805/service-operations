import { describe, it, expect } from 'vitest';
import { validateChangePasswordForm, validateForgotPasswordForm, validateResetPasswordForm } from '../authValidators';

describe('validateChangePasswordForm (NCL-01-CN-008-TC-01)', () => {
  it('yêu cầu mật khẩu hiện tại và mật khẩu mới', () => {
    const errors = validateChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    expect(errors.currentPassword).toBeDefined();
    expect(errors.newPassword).toBeDefined();
  });

  it('từ chối mật khẩu mới không đạt chính sách (quá ngắn)', () => {
    const errors = validateChangePasswordForm({
      currentPassword: 'MatKhauCu1',
      newPassword: 'short1',
      confirmPassword: 'short1',
    });
    expect(errors.newPassword).toBeDefined();
  });

  it('từ chối mật khẩu mới không có chữ hoặc không có số', () => {
    expect(
      validateChangePasswordForm({ currentPassword: 'MatKhauCu1', newPassword: 'onlyletters', confirmPassword: 'onlyletters' })
        .newPassword
    ).toBeDefined();
    expect(
      validateChangePasswordForm({ currentPassword: 'MatKhauCu1', newPassword: '12345678', confirmPassword: '12345678' })
        .newPassword
    ).toBeDefined();
  });

  it('từ chối khi mật khẩu mới trùng mật khẩu hiện tại', () => {
    const errors = validateChangePasswordForm({
      currentPassword: 'MatKhauCu1',
      newPassword: 'MatKhauCu1',
      confirmPassword: 'MatKhauCu1',
    });
    expect(errors.newPassword).toBeDefined();
  });

  it('từ chối khi xác nhận mật khẩu không khớp', () => {
    const errors = validateChangePasswordForm({
      currentPassword: 'MatKhauCu1',
      newPassword: 'MatKhauMoi2',
      confirmPassword: 'KhacHoanToan3',
    });
    expect(errors.confirmPassword).toBeDefined();
  });

  it('chấp nhận dữ liệu hợp lệ', () => {
    const errors = validateChangePasswordForm({
      currentPassword: 'MatKhauCu1',
      newPassword: 'MatKhauMoi2',
      confirmPassword: 'MatKhauMoi2',
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe('validateForgotPasswordForm (NCL-01-CN-008)', () => {
  it('yêu cầu email không được để trống', () => {
    expect(validateForgotPasswordForm({ email: '' }).email).toBeDefined();
  });

  it('từ chối email không hợp lệ', () => {
    expect(validateForgotPasswordForm({ email: 'khong-hop-le' }).email).toBeDefined();
  });

  it('chấp nhận email hợp lệ', () => {
    expect(validateForgotPasswordForm({ email: 'user@company.com' }).email).toBeUndefined();
  });
});

describe('validateResetPasswordForm (NCL-01-CN-008-TC-02)', () => {
  it('yêu cầu mật khẩu mới đạt chính sách', () => {
    expect(validateResetPasswordForm({ newPassword: 'short', confirmPassword: 'short' }).newPassword).toBeDefined();
  });

  it('từ chối khi xác nhận mật khẩu không khớp', () => {
    const errors = validateResetPasswordForm({ newPassword: 'MatKhauMoi2', confirmPassword: 'Khac123' });
    expect(errors.confirmPassword).toBeDefined();
  });

  it('chấp nhận dữ liệu hợp lệ', () => {
    const errors = validateResetPasswordForm({ newPassword: 'MatKhauMoi2', confirmPassword: 'MatKhauMoi2' });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});
