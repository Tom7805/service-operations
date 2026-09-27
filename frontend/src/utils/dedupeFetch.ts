/**
 * Gộp các yêu cầu GET GIỐNG HỆT NHAU đang chạy cùng lúc thành một lần gọi mạng.
 *
 * Vì sao: đo thực tế mỗi lần chuyển menu, MỌI API bị gọi hai lần — React StrictMode chạy hiệu ứng
 * hai lần khi phát triển, và nhiều khối trên cùng một màn hình tự gọi cùng một danh sách (vd trang
 * Đơn giá gọi /contracts từ hai nơi). Gộp lại giảm một nửa tải cho backend và một thao tác của người
 * dùng chỉ ghi một dòng nhật ký "đã xem" thay vì hai.
 *
 * Cố ý KHÔNG lưu đệm theo thời gian: nhiều API GET ghi nhật ký truy cập dữ liệu nhạy cảm mỗi lần
 * xem (giá vốn, biên lợi nhuận, báo cáo…) — trả kết quả cũ từ bộ nhớ sẽ làm thiếu nhật ký kiểm toán.
 * Chỉ các yêu cầu đang BAY cùng lúc mới dùng chung một phản hồi.
 */
export function installFetchDedupe(match: (url: string) => boolean): void {
  if (typeof window === 'undefined' || (window.fetch as { __deduped?: boolean }).__deduped) return;
  const nativeFetch = window.fetch.bind(window);
  const inflight = new Map<string, Promise<Response>>();

  const deduped = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Chỉ gộp GET không thân, gọi bằng URL (không phải đối tượng Request tự dựng).
    const method = (init?.method ?? 'GET').toUpperCase();
    if (method !== 'GET' || init?.body != null || input instanceof Request) return nativeFetch(input, init);
    const url = typeof input === 'string' ? input : input.toString();
    if (!match(url)) return nativeFetch(input, init);

    const headers = new Headers(init?.headers);
    const key = `${url}|${headers.get('Authorization') ?? ''}|${headers.get('Accept') ?? ''}`;

    let shared = inflight.get(key);
    if (!shared) {
      // Lần gọi chung không mang tín hiệu huỷ của riêng ai: một người huỷ (vd hiệu ứng bị dọn khi
      // StrictMode chạy lại) không được làm hỏng phản hồi của người còn lại.
      const { signal: _ignored, ...rest } = init ?? {};
      void _ignored;
      shared = nativeFetch(input, rest).finally(() => inflight.delete(key));
      inflight.set(key, shared);
    }

    const signal = init?.signal;
    return new Promise<Response>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
      signal?.addEventListener('abort', onAbort, { once: true });
      shared!.then(
        // Mỗi người nhận một BẢN SAO: thân phản hồi chỉ đọc được một lần.
        (res) => {
          signal?.removeEventListener('abort', onAbort);
          resolve(res.clone());
        },
        (err) => {
          signal?.removeEventListener('abort', onAbort);
          reject(err);
        },
      );
    });
  };

  (deduped as { __deduped?: boolean }).__deduped = true;
  window.fetch = deduped as typeof window.fetch;
}
