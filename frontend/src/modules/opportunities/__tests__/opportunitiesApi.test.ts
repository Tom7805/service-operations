import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createOpportunity,
  fetchCustomersForSelect,
  OpportunityApiError,
} from '../api/opportunitiesApi';
import type { OpportunityCreatePayload } from '../types/opportunityTypes';

function mockFetchOnce(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

const validPayload: OpportunityCreatePayload = {
  name: '  Triển khai ERP cho ABC  ',
  customerId: 1,
  expectedValue: 500000000,
  expectedCloseDate: ' 2026-12-31 ',
  ownerId: null,
};

describe('opportunitiesApi (NCL-03-CN-001)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createOpportunity', () => {
    it('trả về data khi backend phản hồi 200 thành công', async () => {
      const created = {
        id: 1,
        name: 'Triển khai ERP cho ABC',
        customerId: 1,
        expectedValue: 500000000,
        stage: 'APPROACH',
        status: 'OPEN',
      };
      vi.stubGlobal(
        'fetch',
        mockFetchOnce(200, { success: true, message: 'ok', data: created })
      );

      const res = await createOpportunity(validPayload);
      expect(res).toEqual(created);
    });

    it('cắt khoảng trắng name/expectedCloseDate và gắn Authorization header từ token đã lưu', async () => {
      localStorage.setItem('token', 'abc123');
      const fetchMock = mockFetchOnce(200, { success: true, data: { id: 1 } });
      vi.stubGlobal('fetch', fetchMock);

      await createOpportunity(validPayload);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(String(url)).toContain('/opportunities');
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe('Bearer abc123');
      expect(JSON.parse(options.body)).toEqual({
        name: 'Triển khai ERP cho ABC',
        customerId: 1,
        expectedValue: 500000000,
        expectedCloseDate: '2026-12-31',
        ownerId: null,
      });
    });

    it.each([
      [403, 'FORBIDDEN'],
      [404, 'RESOURCE_NOT_FOUND'],
      [401, 'UNAUTHORIZED'],
    ])('ném OpportunityApiError với mã suy ra từ HTTP %i khi backend không trả errorCode', async (status, code) => {
      vi.stubGlobal('fetch', mockFetchOnce(status, {}));

      await expect(createOpportunity(validPayload)).rejects.toMatchObject({
        name: 'OpportunityApiError',
        code,
        statusCode: status,
      });
    });

    it('ưu tiên errorCode/message do backend trả về (400 VALIDATION_ERROR)', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce(400, {
          success: false,
          errorCode: 'VALIDATION_ERROR',
          message: 'Giá trị dự kiến phải là số dương',
          fieldErrors: [{ field: 'expectedValue', message: 'phải > 0' }],
        })
      );

      await expect(createOpportunity(validPayload)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Giá trị dự kiến phải là số dương',
        fieldErrors: [{ field: 'expectedValue', message: 'phải > 0' }],
      });
    });

    it('ném OpportunityApiError mã NETWORK_ERROR khi fetch thất bại', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed to fetch')));

      await expect(createOpportunity(validPayload)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        statusCode: 503,
      });
    });
  });

  describe('fetchCustomersForSelect', () => {
    it('lọc bỏ khách hàng đã gộp (MERGED) và chỉ giữ các trường cần cho dropdown', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce(200, {
          success: true,
          data: [
            { id: 1, code: 'KH-000001', name: 'ABC', status: 'ACTIVE', extra: 'x' },
            { id: 2, code: 'KH-000002', name: 'XYZ', status: 'MERGED' },
          ],
        })
      );

      const res = await fetchCustomersForSelect();
      expect(res).toEqual([{ id: 1, code: 'KH-000001', name: 'ABC', status: 'ACTIVE' }]);
    });

    it('trả mảng rỗng khi backend trả data: [] (không phải lỗi)', async () => {
      vi.stubGlobal('fetch', mockFetchOnce(200, { success: true, data: [] }));
      await expect(fetchCustomersForSelect()).resolves.toEqual([]);
    });

    it('ném lỗi (không nuốt) khi backend trả 403 để giao diện phân biệt được với "không có khách hàng"', async () => {
      vi.stubGlobal('fetch', mockFetchOnce(403, { success: false, message: 'Không đủ quyền' }));
      await expect(fetchCustomersForSelect()).rejects.toBeInstanceOf(OpportunityApiError);
    });
  });
});
