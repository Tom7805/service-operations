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

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fake') },
}));

describe('TwoFactorVerifyForm (NCL-01-CN-009-TC-01/TC-02) — TOTP kiểu Google Authenticator', () => {
  beforeEach(() => {
    mockVerifyTwoFactor.mockReset();
  });

  it('TC-01: gọi verifyTwoFactor với challengeToken + mã rồi trả về phiên đã đăng nhập', async () => {
    const session = { accessToken: 'tok', tokenType: 'Bearer', userId: 5, username: 'finance-user', fullName: 'Finance User', roles: ['VT-05'] };
    mockVerifyTwoFactor.mockResolvedValue(session);
    const onVerified = vi.fn();

    render(
      <TwoFactorVerifyForm
        challengeToken="challenge-abc"
        username="finance-user"
        totpEnrollment={false}
        otpauthUri={null}
        totpSecretForDisplay={null}
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
        totpEnrollment={false}
        otpauthUri={null}
        totpSecretForDisplay={null}
        onVerified={vi.fn()}
        onBackToLogin={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Mã xác thực'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Mã xác thực gồm đúng 6 chữ số');
    expect(mockVerifyTwoFactor).not.toHaveBeenCalled();
  });

  it('TC-02: hiển thị thông báo khóa tạm từ backend khi sai mã quá số lần cho phép', async () => {
    const { AuthApiError } = await import('../../api/authApi');
    mockVerifyTwoFactor.mockRejectedValue(
      new AuthApiError('ACCOUNT_LOCKED', 'Nhap sai ma xac thuc qua so lan cho phep. Tai khoan tam khoa, vui long thu lai sau.')
    );

    render(
      <TwoFactorVerifyForm
        challengeToken="challenge-abc"
        username="finance-user"
        totpEnrollment={false}
        otpauthUri={null}
        totpSecretForDisplay={null}
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
        totpEnrollment={false}
        otpauthUri={null}
        totpSecretForDisplay={null}
        onVerified={vi.fn()}
        onBackToLogin={onBackToLogin}
      />
    );

    fireEvent.click(screen.getByText(/Quay lại đăng nhập/i));

    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });

  describe('Thiết lập lần đầu (totpEnrollment = true)', () => {
    it('hiện mã QR và khóa dự phòng để liên kết app Authenticator', async () => {
      render(
        <TwoFactorVerifyForm
          challengeToken="challenge-abc"
          username="ketoan01"
          totpEnrollment
          otpauthUri="otpauth://totp/Van%20Hanh%20Dich%20Vu:ketoan01?secret=ABCD1234&issuer=Van%20Hanh%20Dich%20Vu&algorithm=SHA1&digits=6&period=30"
          totpSecretForDisplay="ABCD 1234"
          onVerified={vi.fn()}
          onBackToLogin={vi.fn()}
        />
      );

      expect(screen.getByText(/Liên kết ứng dụng Authenticator/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('totp-qr-box').querySelector('img')).toHaveAttribute(
          'src',
          'data:image/png;base64,fake'
        );
      });

      fireEvent.click(screen.getByText(/Không quét được QR/i));
      expect(screen.getByTestId('totp-secret')).toHaveTextContent('ABCD 1234');
    });

    it('nút "Sao chép" copy đúng khóa (không dấu cách) thay vì bắt người dùng tự bôi đen', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      render(
        <TwoFactorVerifyForm
          challengeToken="challenge-abc"
          username="ketoan01"
          totpEnrollment
          otpauthUri="otpauth://totp/Van%20Hanh%20Dich%20Vu:ketoan01?secret=ABCD1234&issuer=Van%20Hanh%20Dich%20Vu"
          totpSecretForDisplay="ABCD 1234"
          onVerified={vi.fn()}
          onBackToLogin={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText(/Không quét được QR/i));
      fireEvent.click(screen.getByRole('button', { name: /Sao chép khóa bí mật/i }));

      await waitFor(() => expect(writeText).toHaveBeenCalledWith('ABCD1234'));
      expect(screen.getByTestId('totp-copy-btn')).toHaveTextContent('Đã sao chép');
    });

    it('không hiện QR/khóa bí mật khi đã thiết lập từ trước (totpEnrollment = false)', () => {
      render(
        <TwoFactorVerifyForm
          challengeToken="challenge-abc"
          username="ketoan01"
          totpEnrollment={false}
          otpauthUri={null}
          totpSecretForDisplay={null}
          onVerified={vi.fn()}
          onBackToLogin={vi.fn()}
        />
      );

      expect(screen.queryByTestId('totp-qr-box')).not.toBeInTheDocument();
      expect(screen.queryByTestId('totp-secret')).not.toBeInTheDocument();
      expect(screen.getByText(/Nhập mã xác thực/i)).toBeInTheDocument();
    });
  });
});
