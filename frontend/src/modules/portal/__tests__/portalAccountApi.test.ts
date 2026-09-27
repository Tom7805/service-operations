import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPortalAccount, fetchPortalAccountHistory, PortalAccountApiError } from '../api/portalAccountApi';

function entry(id: number, action: string, targetId: number | null, performedAt: string, targetLabel = '') {
  return { id, actorUserId: 1, actorUsername: 'admin', actorRole: 'VT-07', action, targetType: 'PORTAL', targetId, targetLabel, detail: null, performedAt };
}

function respond(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('portalAccountApi (NCL-13-CN-001)', () => {
  it('TC-04: lịch sử chỉ giữ thao tác cấp/khoá/mở khoá của đúng tài khoản, mới nhất trước', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respond({
        success: true,
        data: {
          content: [
            entry(39, 'Khóa tài khoản cổng khách hàng', 2, '2026-09-25T09:21:14'),
            entry(40, 'Mở khóa tài khoản cổng khách hàng', 2, '2026-09-25T09:21:14'),
            entry(38, 'Cấp tài khoản cổng khách hàng', 2, '2026-09-25T09:21:13'),
            entry(37, 'Cấp tài khoản cổng khách hàng', 9, '2026-09-25T09:00:00'),
          ],
        },
      })
    );
    const list = await fetchPortalAccountHistory(2);
    expect(list.map((e) => e.id)).toEqual([40, 39, 38]);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toMatch(/\/audit-logs$/);
    expect(url.searchParams.get('targetType')).toBe('PORTAL');
  });

  it('TC-03: kèm lượt bị từ chối mở chức năng cấp tài khoản cổng khi được yêu cầu', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const action = new URL(String(input)).searchParams.get('action');
      return respond({
        success: true,
        data: {
          content:
            action === 'Từ chối truy cập'
              ? [
                  entry(41, 'Từ chối truy cập', null, '2026-09-25T09:21:15', 'Cấp tài khoản cổng khách hàng'),
                  entry(42, 'Từ chối truy cập', null, '2026-09-25T09:21:16', 'Cổng theo dõi dự án'),
                ]
              : [entry(38, 'Cấp tài khoản cổng khách hàng', 2, '2026-09-25T09:21:13')],
        },
      });
    });
    const list = await fetchPortalAccountHistory(undefined, 50, true);
    expect(list.map((e) => e.id)).toEqual([41, 38]);
  });

  it('lỗi nghiệp vụ trả về PortalAccountApiError giữ errorCode và thông báo máy chủ', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respond({ success: false, errorCode: 'DUPLICATE_DATA', message: 'Ten dang nhap x da ton tai' }, 409)
    );
    const err = await createPortalAccount({ contactId: 1, username: 'xyz', password: 'Matkhau123' }).catch((e) => e);
    expect(err).toBeInstanceOf(PortalAccountApiError);
    expect(err.code).toBe('DUPLICATE_DATA');
    expect(err.statusCode).toBe(409);
  });
});
