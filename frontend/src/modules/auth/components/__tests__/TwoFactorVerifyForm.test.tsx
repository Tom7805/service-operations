import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TwoFactorVerifyForm from '../TwoFactorVerifyForm';

const mockVerifyTwoFactor = vi.fn();

vi.mock('../../api/authApi', () => ({
  verifyTwoFactor: (...args: unknown[]) => mockVerifyTwoFactor(...args),
  AuthApiError: class AuthApiError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message);
    }
  },
}));

describe('TwoFactorVerifyForm (NCL-01-CN-009-TC-01/TC-02)', () => {
  beforeEach(() => {
    mockVerifyTwoFactor.mockReset();
  });

  it('TC-01: gọi verifyTwoFactor với challengeToken + OTP rồi trả về phiên đã đăng nhập', async () => {
    const session = { accessToken: 'tok', tokenType: 'Bearer', userId: 5, username: 'finance-user', fullName: 'Finance User', roles: ['VT-05'] };
    mockVerifyTwoFactor.mockResolvedValue(session);
    const onVerified = vi.fn();

    render(
      <TwoFactorVerifyForm
        challengeToken="challenge-abc"
        username="finance-user"
        onVerified={onVerified}
        onBackToLogin={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Mã xác thực'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận/i }));

    await waitFor(() => expect(onVerified).toHaveBeenCalledWith(session));
    expect(mockVerifyTwoFactor).toHaveBeenCalledWith({ challengeToken: 'challenge-abc', otp: '123456' });
  });

  it('báo lỗi khi chưa nhập đủ 6 chữ số, không gọi API', () => {
    render(
      <TwoFactorVerifyForm
        challengeToken="challenge-abc"
        username="finance-user"
        onVerified={vi.fn()}
        onBackToLogin={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Mã xác thực'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Mã xác thực gồm đúng 6 chữ số');
    expect(mockVerifyTwoFactor).not.toHaveBeenCalled();
  });

  it('TC-02: hiển thị thông báo khóa tạm từ backend khi sai OTP quá số lần cho phép', async () => {
    const { AuthApiError } = await import('../../api/authApi');
    mockVerifyTwoFactor.mockRejectedValue(
      new AuthApiError('ACCOUNT_LOCKED', 'Nhap sai ma xac thuc qua so lan cho phep. Tai khoan tam khoa, vui long thu lai sau.')
    );

    render(
      <TwoFactorVerifyForm
        challengeToken="challenge-abc"
        username="finance-user"
        onVerified={vi.fn()}
        onBackToLogin={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Mã xác thực'), { target: { value: '999999' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/tam khoa/i);
    });
  });

  it('gọi onBackToLogin khi bấm liên kết "Quay lại đăng nhập"', () => {
    const onBackToLogin = vi.fn();
    render(
      <TwoFactorVerifyForm
        challengeToken="challenge-abc"
        username="finance-user"
        onVerified={vi.fn()}
        onBackToLogin={onBackToLogin}
      />
    );

    fireEvent.click(screen.getByText(/Quay lại đăng nhập/i));

    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });
});
