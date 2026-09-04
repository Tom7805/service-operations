import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSessionSync } from '../useSessionSync';
import * as authApi from '../../modules/auth/api/authApi';
import type { AuthSession } from '../../modules/auth/types/authTypes';

vi.mock('../../modules/auth/api/authApi', async () => {
  const actual = await vi.importActual<typeof import('../../modules/auth/api/authApi')>(
    '../../modules/auth/api/authApi'
  );
  return { ...actual, fetchCurrentUser: vi.fn() };
});

const session: AuthSession = {
  accessToken: 'tok',
  tokenType: 'Bearer',
  userId: 7,
  username: 'sale01',
  fullName: 'Đỗ Thị Mai',
  roles: ['VT-04'],
};

describe('useSessionSync (NCL-01-CN-004 TC-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('làm mới phiên khi máy chủ trả về vai trò khác', async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue({
      userId: 7,
      username: 'sale01',
      fullName: 'Đỗ Thị Mai',
      roles: [], // vai trò VT-04 vừa bị thu hồi
    });
    const onRefresh = vi.fn();

    renderHook(() => useSessionSync({ session, onRefresh, onExpired: vi.fn() }));

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledWith(expect.objectContaining({ roles: [] }));
    });
  });

  it('không gọi onRefresh khi vai trò không đổi', async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue({
      userId: 7,
      username: 'sale01',
      fullName: 'Đỗ Thị Mai',
      roles: ['VT-04'],
    });
    const onRefresh = vi.fn();

    renderHook(() => useSessionSync({ session, onRefresh, onExpired: vi.fn() }));

    await waitFor(() => expect(authApi.fetchCurrentUser).toHaveBeenCalled());
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('gọi onExpired khi máy chủ trả 401', async () => {
    vi.mocked(authApi.fetchCurrentUser).mockRejectedValue(new authApi.SessionSyncError(401, 'hết hạn'));
    const onExpired = vi.fn();

    renderHook(() => useSessionSync({ session, onRefresh: vi.fn(), onExpired }));

    await waitFor(() => expect(onExpired).toHaveBeenCalled());
  });

  it('không làm gì khi chưa đăng nhập (session = null)', async () => {
    renderHook(() => useSessionSync({ session: null, onRefresh: vi.fn(), onExpired: vi.fn() }));
    await new Promise((r) => setTimeout(r, 0));
    expect(authApi.fetchCurrentUser).not.toHaveBeenCalled();
  });
});
