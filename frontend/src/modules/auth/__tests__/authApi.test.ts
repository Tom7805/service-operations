import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  login,
  LoginRequestError,
  changePassword,
  forgotPassword,
  validateResetToken,
  resetPassword,
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
});
