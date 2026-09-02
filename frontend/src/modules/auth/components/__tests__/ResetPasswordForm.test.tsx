import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResetPasswordForm from '../ResetPasswordForm';

const mockResetPassword = vi.fn();

vi.mock('../../api/authApi', () => ({
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

const EMAIL = 'nhanvien01@service-operations.local';

describe('ResetPasswordForm — nhập mã khôi phục (NCL-01-CN-008)', () => {
  beforeEach(() => {
    mockResetPassword.mockReset();
  });

  it('hiện ngay ô nhập mã, không gọi API kiểm tra trước', () => {
    render(<ResetPasswordForm email={EMAIL} onDone={vi.fn()} onRequestNewCode={vi.fn()} />);

    expect(screen.getByLabelText('Mã khôi phục')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu mới')).toBeInTheDocument();
    // Địa chỉ email phải hiện ra để người dùng biết cần mở hộp thư nào.
    expect(screen.getByText(EMAIL)).toBeInTheDocument();
  });

  it('chặn mã không đủ 6 chữ số ngay tại giao diện, không gọi API', async () => {
    render(<ResetPasswordForm email={EMAIL} onDone={vi.fn()} onRequestNewCode={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Mã khôi phục'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'MatKhauMoi2' } });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'MatKhauMoi2' } });
    fireEvent.click(screen.getByRole('button', { name: /Đặt lại mật khẩu/i }));

    await waitFor(() => {
      expect(screen.getByText('Mã khôi phục gồm đúng 6 chữ số')).toBeInTheDocument();
    });
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('loại bỏ ký tự không phải chữ số khi gõ vào ô mã', () => {
    render(<ResetPasswordForm email={EMAIL} onDone={vi.fn()} onRequestNewCode={vi.fn()} />);

    const oMa = screen.getByLabelText('Mã khôi phục') as HTMLInputElement;
    fireEvent.change(oMa, { target: { value: '12ab34cd56' } });

    expect(oMa.value).toBe('123456');
  });

  it('đặt lại mật khẩu thành công: gửi kèm CẢ email lẫn mã', async () => {
    mockResetPassword.mockResolvedValue(undefined);

    render(<ResetPasswordForm email={EMAIL} onDone={vi.fn()} onRequestNewCode={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Mã khôi phục'), { target: { value: '483920' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'MatKhauMoi2' } });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'MatKhauMoi2' } });
    fireEvent.click(screen.getByRole('button', { name: /Đặt lại mật khẩu/i }));

    await waitFor(() => {
      expect(screen.getByText('Đặt lại mật khẩu thành công')).toBeInTheDocument();
    });
    // Email BẮT BUỘC phải đi kèm: máy chủ tra cứu mã theo người dùng, không
    // tra cứu bằng mã trần.
    expect(mockResetPassword).toHaveBeenCalledWith({
      email: EMAIL,
      code: '483920',
      newPassword: 'MatKhauMoi2',
    });
  });

  it('mã sai: hiện thông báo từ máy chủ và KHÔNG chuyển sang màn thành công', async () => {
    const { AuthApiError } = (await import('../../api/authApi')) as unknown as {
      AuthApiError: new (code: string, message: string) => Error;
    };
    mockResetPassword.mockRejectedValue(
      new AuthApiError('RESET_TOKEN_INVALID', 'Ma khoi phuc khong dung hoac da het han')
    );

    render(<ResetPasswordForm email={EMAIL} onDone={vi.fn()} onRequestNewCode={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Mã khôi phục'), { target: { value: '000000' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'MatKhauMoi2' } });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'MatKhauMoi2' } });
    fireEvent.click(screen.getByRole('button', { name: /Đặt lại mật khẩu/i }));

    await waitFor(() => {
      expect(screen.getByText(/khong dung hoac da het han/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Đặt lại mật khẩu thành công')).not.toBeInTheDocument();
  });
});
