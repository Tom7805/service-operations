import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { installFetchDedupe } from '../dedupeFetch';

const API = 'http://localhost:8080/api/v1';

describe('installFetchDedupe', () => {
  const original = window.fetch;
  let native: Mock<[], Promise<Response>>;
  let release: (() => void) | null;

  beforeEach(() => {
    release = null;
    native = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        }),
    );
    window.fetch = native as unknown as typeof window.fetch;
    installFetchDedupe((url) => url.includes('/api/v1/'));
  });

  afterEach(() => {
    window.fetch = original;
  });

  it('hai GET giống hệt nhau cùng lúc chỉ gọi mạng một lần, mỗi bên đọc được thân phản hồi riêng', async () => {
    const a = window.fetch(`${API}/contracts`, { headers: { Authorization: 'Bearer t' } });
    const b = window.fetch(`${API}/contracts`, { headers: { Authorization: 'Bearer t' } });
    release!();
    const [ra, rb] = await Promise.all([a, b]);
    expect(native).toHaveBeenCalledTimes(1);
    expect(await ra.json()).toEqual({ ok: true });
    expect(await rb.json()).toEqual({ ok: true });
  });

  it('bên thứ nhất huỷ (StrictMode dọn hiệu ứng) không làm hỏng phản hồi của bên thứ hai', async () => {
    const ctrl = new AbortController();
    const a = window.fetch(`${API}/users`, { signal: ctrl.signal });
    const b = window.fetch(`${API}/users`);
    ctrl.abort();
    await expect(a).rejects.toMatchObject({ name: 'AbortError' });
    release!();
    const rb = await b;
    expect(native).toHaveBeenCalledTimes(1);
    expect(await rb.json()).toEqual({ ok: true });
  });

  it('yêu cầu thay đổi dữ liệu (POST) và URL ngoài API luôn đi thẳng, không gộp', async () => {
    void window.fetch(`${API}/contracts`, { method: 'POST', body: '{}' });
    void window.fetch(`${API}/contracts`, { method: 'POST', body: '{}' });
    void window.fetch('/assets/logo.svg');
    void window.fetch('/assets/logo.svg');
    expect(native).toHaveBeenCalledTimes(4);
  });

  it('xong lượt bay thì lần gọi sau đi mạng lại — không lưu đệm theo thời gian (giữ nhật ký "đã xem")', async () => {
    const first = window.fetch(`${API}/labor-cost`);
    release!();
    await first;
    const second = window.fetch(`${API}/labor-cost`);
    release!();
    await second;
    expect(native).toHaveBeenCalledTimes(2);
  });
});
