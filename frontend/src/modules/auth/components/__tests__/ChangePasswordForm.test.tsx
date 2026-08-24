import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChangePasswordForm from '../ChangePasswordForm';

const mockChangePassword = vi.fn();

vi.mock('../../api/authApi', () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
  AuthApiError: class AuthApiError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message);
    }
  },
}));

describe('ChangePasswordForm (NCL-01-CN-008-TC-01)', () => {
  beforeEach(() => {
    mockChangePassword.mockReset();
  });

  it('hiển thị lỗi validate khi mật khẩu mới không đạt chính sách, không gọi API', () => {
    render(<ChangePasswordForm onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/i), { target: { value: 'MatKhauCu1' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu mới/i), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /Đổi mật khẩu/i }));

    expect(screen.getByText(/ít nhất 8 ký tự/i)).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('gọi onSuccess khi đổi mật khẩu thành công', async () => {
    mockChangePassword.mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    render(<ChangePasswordForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/i), { target: { value: 'MatKhauCu1' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/i), { target: { value: 'MatKhauMoi2' } });
    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu mới/i), { target: { value: 'MatKhauMoi2' } });
    fireEvent.click(screen.getByRole('button', { name: /Đổi mật khẩu/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(mockChangePassword).toHaveBeenCalledWith({ currentPassword: 'MatKhauCu1', newPassword: 'MatKhauMoi2' });
  });

  it('hiển thị lỗi từ server khi mật khẩu hiện tại sai', async () => {
    const { AuthApiError } = await import('../../api/authApi');
    mockChangePassword.mockRejectedValue(new AuthApiError('INVALID_CREDENTIALS', 'Mật khẩu hiện tại không đúng'));

    render(<ChangePasswordForm onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/i), { target: { value: 'SaiRoi1' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/i), { target: { value: 'MatKhauMoi2' } });
    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu mới/i), { target: { value: 'MatKhauMoi2' } });
    fireEvent.click(screen.getByRole('button', { name: /Đổi mật khẩu/i }));

    await waitFor(() => {
      expect(screen.getByText(/Mật khẩu hiện tại không đúng/)).toBeInTheDocument();
    });
  });
});
