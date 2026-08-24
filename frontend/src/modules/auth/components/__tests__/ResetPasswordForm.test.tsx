import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResetPasswordForm from '../ResetPasswordForm';

const mockValidateResetToken = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('../../api/authApi', () => ({
  validateResetToken: (...args: unknown[]) => mockValidateResetToken(...args),
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  AuthApiError: class AuthApiError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message);
    }
  },
}));

describe('ResetPasswordForm (NCL-01-CN-008-TC-02)', () => {
  beforeEach(() => {
    mockValidateResetToken.mockReset();
    mockResetPassword.mockReset();
  });

  it('TC-02: hiển thị thông báo liên kết hết hạn khi token không hợp lệ, không cho nhập mật khẩu mới', async () => {
    mockValidateResetToken.mockResolvedValue(false);

    render(<ResetPasswordForm token="het-han" onDone={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Liên kết đã hết hạn')).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/Mật khẩu mới/i)).not.toBeInTheDocument();
  });

  it('TC-02: hiển thị form đặt mật khẩu mới khi token hợp lệ', async () => {
    mockValidateResetToken.mockResolvedValue(true);

    render(<ResetPasswordForm token="hop-le" onDone={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Đặt mật khẩu mới')).toBeInTheDocument();
    });
  });

  it('đặt lại mật khẩu thành công và hiển thị màn hình xác nhận', async () => {
    mockValidateResetToken.mockResolvedValue(true);
    mockResetPassword.mockResolvedValue(undefined);

    render(<ResetPasswordForm token="hop-le" onDone={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Đặt mật khẩu mới')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'MatKhauMoi2' } });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'MatKhauMoi2' } });
    fireEvent.click(screen.getByRole('button', { name: /Đặt lại mật khẩu/i }));

    await waitFor(() => {
      expect(screen.getByText('Đặt lại mật khẩu thành công')).toBeInTheDocument();
    });
    expect(mockResetPassword).toHaveBeenCalledWith({ token: 'hop-le', newPassword: 'MatKhauMoi2' });
  });
});
