import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __setHttpOptimizationsEnabled, httpFetch } from '../http';

const BASE = 'http://api.test/api/v1';

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('httpFetch', () => {
  type FetchArgs = Parameters<typeof fetch>;
  let fetchMock: ReturnType<typeof vi.fn<FetchArgs, Promise<Response>>>;

  beforeEach(() => {
    fetchMock = vi.fn<FetchArgs, Promise<Response>>(async () => jsonResponse({ ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    __setHttpOptimizationsEnabled(true);
  });

  afterEach(() => {
    __setHttpOptimizationsEnabled(false);
    vi.unstubAllGlobals();
  });

  it('gộp các GET trùng nhau đang chạy và mỗi bên đọc được body riêng', async () => {
    const init = { headers: { Authorization: 'Bearer t1' } };
    const [a, b] = await Promise.all([
      httpFetch(`${BASE}/projects`, init),
      httpFetch(`${BASE}/projects`, init),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await a.json()).toEqual({ success: true, data: { ok: 1 } });
    expect(await b.json()).toEqual({ success: true, data: { ok: 1 } });
  });

  it('không gộp khi token khác nhau, và không cache endpoint không phải tra cứu', async () => {
    await Promise.all([
      httpFetch(`${BASE}/projects`, { headers: { Authorization: 'Bearer t1' } }),
      httpFetch(`${BASE}/projects`, { headers: { Authorization: 'Bearer t2' } }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await httpFetch(`${BASE}/projects`, { headers: { Authorization: 'Bearer t1' } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('cache endpoint tra cứu trong TTL và xoá cache khi có request ghi', async () => {
    await httpFetch(`${BASE}/roles`);
    const cached = await httpFetch(`${BASE}/roles`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cached.status).toBe(200);
    expect(await cached.json()).toEqual({ success: true, data: { ok: 1 } });

    await httpFetch(`${BASE}/departments`, { method: 'POST', body: '{}' });
    await httpFetch(`${BASE}/roles`);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('không cache phản hồi lỗi và giữ nguyên status', async () => {
    fetchMock.mockImplementationOnce(async () => jsonResponse(null, 500));
    const failed = await httpFetch(`${BASE}/roles`);
    expect(failed.status).toBe(500);
    expect(failed.ok).toBe(false);
    await httpFetch(`${BASE}/roles`);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('xử lý phản hồi 204 không có body', async () => {
    fetchMock.mockImplementationOnce(async () => new Response(null, { status: 204 }));
    const res = await httpFetch(`${BASE}/projects/1`);
    expect(res.status).toBe(204);
  });

  it('truyền AbortSignal và lan truyền lỗi mạng', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(async () => {
      throw new DOMException('aborted', 'AbortError');
    });
    await expect(httpFetch(`${BASE}/projects`, { signal: controller.signal })).rejects.toThrow('aborted');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal: controller.signal });
  });

  it('là pass-through khi bị tắt (chế độ test mặc định)', async () => {
    __setHttpOptimizationsEnabled(false);
    await Promise.all([httpFetch(`${BASE}/roles`), httpFetch(`${BASE}/roles`)]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
