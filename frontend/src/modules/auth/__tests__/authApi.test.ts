import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  login,
  LoginRequestError,
  changePassword,
  forgotPassword,
  validateResetToken,
  resetPassword,
  verifyTwoFactor,
  getTwoFactorConfigs,
  updateTwoFactorConfig,
  isTwoFactorChallenge,
  AuthApiError,
} from '../api/authApi';

function mockFetchOnce(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('authApi (NCL-01-CN-001, NCL-01-CN-008)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login: trả về AuthSession khi thành công', async () => {
    const session = { accessToken: 'tok', tokenType: 'Bearer', userId: 1, username: 'admin', fullName: 'Admin', roles: ['VT-07'] };
    vi.stubGlobal('fetch', mockFetchOnce(200, { success: true, data: session }));

    const result = await login('admin', 'Password@123');
    expect(result).toEqual(session);
  });

  it('login: ném LoginRequestError khi sai mật khẩu', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchOnce(401, { success: false, errorCode: 'INVALID_CREDENTIALS', message: 'Sai tai khoan hoac mat khau' })
    );

    await expect(login('admin', 'sai')).rejects.toBeInstanceOf(LoginRequestError);
  });

  it('changePassword: gửi kèm Authorization header từ token đã lưu', async () => {
    localStorage.setItem('token', 'abc123');
    const fetchMock = mockFetchOnce(200, { success: true, data: null });
    vi.stubGlobal('fetch', fetchMock);

    await changePassword({ currentPassword: 'MatKhauCu1', newPassword: 'MatKhauMoi2' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/change-password'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer abc123' }),
      })
    );
  });

  it('changePassword: ném AuthApiError khi mật khẩu hiện tại sai (401 INVALID_CREDENTIALS)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchOnce(401, { success: false, errorCode: 'INVALID_CREDENTIALS', message: 'Mat khau hien tai khong dung' })
    );

    await expect(changePassword({ currentPassword: 'sai', newPassword: 'MatKhauMoi2' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('forgotPassword: luôn thành công (backend không tiết lộ email có tồn tại hay không)', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(200, { success: true, data: null }));
    await expect(forgotPassword({ email: 'khongton@example.com' })).resolves.toBeUndefined();
  });

  it('validateResetToken: trả về false khi liên kết hết hạn/không tồn tại', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(200, { success: true, data: false }));
    await expect(validateResetToken('het-han')).resolves.toBe(false);
  });

  it('resetPassword: ném AuthApiError với mã RESET_TOKEN_INVALID khi liên kết không hợp lệ', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchOnce(400, { success: false, errorCode: 'RESET_TOKEN_INVALID', message: 'Lien ket khong hop le' })
    );

    await expect(resetPassword({ token: 'het-han', newPassword: 'MatKhauMoi2' })).rejects.toBeInstanceOf(AuthApiError);
  });

  // NCL-01-CN-009
  it('login: trả về TwoFactorChallenge khi vai trò đang bật 2FA, không lộ accessToken', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchOnce(200, {
        success: true,
        data: {
          accessToken: null,
          tokenType: null,
          userId: 5,
          username: 'finance-user',
          fullName: 'Finance User',
          roles: ['VT-05'],
          requiresTwoFactor: true,
          challengeToken: 'challenge-abc',
        },
      })
    );

    const result = await login('finance-user', 'Password@123');
    expect(result).toEqual({ requiresTwoFactor: true, challengeToken: 'challenge-abc', username: 'finance-user' });
    expect(isTwoFactorChallenge(result)).toBe(true);
  });

  it('verifyTwoFactor: trả về AuthSession sau khi OTP đúng', async () => {
    const backendRes = {
      accessToken: 'tok', tokenType: 'Bearer', userId: 5, username: 'finance-user', fullName: 'Finance User',
      roles: ['VT-05'], requiresTwoFactor: false, challengeToken: null,
    };
    vi.stubGlobal('fetch', mockFetchOnce(200, { success: true, data: backendRes }));

    const result = await verifyTwoFactor({ challengeToken: 'challenge-abc', otp: '123456' });
    expect(result).toEqual({
      accessToken: 'tok', tokenType: 'Bearer', userId: 5, username: 'finance-user', fullName: 'Finance User',
      roles: ['VT-05'],
    });
  });

  it('verifyTwoFactor: ném AuthApiError với mã ACCOUNT_LOCKED khi sai OTP quá số lần cho phép (TC-02)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchOnce(401, {
        success: false,
        errorCode: 'ACCOUNT_LOCKED',
        message: 'Nhap sai ma xac thuc qua so lan cho phep. Tai khoan tam khoa, vui long thu lai sau.',
      })
    );

    await expect(verifyTwoFactor({ challengeToken: 'challenge-abc', otp: '000000' })).rejects.toMatchObject({
      code: 'ACCOUNT_LOCKED',
    });
  });

  it('getTwoFactorConfigs: gửi kèm Authorization header và trả về danh sách cấu hình (TC-03)', async () => {
    localStorage.setItem('token', 'admin-token');
    const configs = [{ roleId: 5, roleCode: 'VT-05', roleName: 'Ke toan', enabled: true, updatedBy: 'admin', updatedAt: '2026-01-01T00:00:00' }];
    const fetchMock = mockFetchOnce(200, { success: true, data: configs });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getTwoFactorConfigs()).resolves.toEqual(configs);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/two-factor/configs'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }) })
    );
  });

  it('updateTwoFactorConfig: gọi PATCH đúng roleId kèm body enabled (TC-04)', async () => {
    localStorage.setItem('token', 'admin-token');
    const updated = { roleId: 5, roleCode: 'VT-05', roleName: 'Ke toan', enabled: true, updatedBy: 'admin', updatedAt: '2026-01-01T00:00:00' };
    const fetchMock = mockFetchOnce(200, { success: true, data: updated });
    vi.stubGlobal('fetch', fetchMock);

    await expect(updateTwoFactorConfig(5, { enabled: true })).resolves.toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/two-factor/configs/5'),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ enabled: true }) })
    );
  });

  it('getTwoFactorConfigs: ném AuthApiError khi không phải quản trị viên (TC-03)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchOnce(403, { success: false, errorCode: 'FORBIDDEN', message: 'Ban khong co quyen truy cap chuc nang nay' })
    );

    await expect(getTwoFactorConfigs()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
