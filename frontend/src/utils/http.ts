/**
 * Lớp `fetch` dùng chung cho mọi `requestBackend` trong src/modules/<module>/api/*.ts.
 *
 * `httpFetch(url, init)` có cùng chữ ký và cùng kết quả với `fetch(url, init)` — mọi logic
 * ánh xạ lỗi (XxxApiError, thông điệp...) vẫn nằm nguyên ở từng module. Lớp này chỉ thêm:
 *
 *  1. Gộp request GET trùng nhau ĐANG CHẠY (cùng URL + cùng header, tức cùng token): nhiều
 *     component cùng mount và cùng gọi một API sẽ chỉ tạo MỘT request mạng. Body của Response
 *     chỉ đọc được một lần, nên body được đọc một lần thành ArrayBuffer rồi mỗi bên gọi nhận
 *     một `Response` MỚI dựng từ bản sao dữ liệu đó (đọc `.json()`/`.text()`/`.blob()` thoải mái).
 *  2. Cache ngắn hạn (TTL) CHỈ cho các endpoint tra cứu/danh mục (xem LOOKUP_ENDPOINTS), chỉ
 *     lưu phản hồi 2xx. Bất kỳ request không phải GET nào (tạo/sửa/xoá) đều xoá TOÀN BỘ cache,
 *     vì một thao tác ghi ở module này có thể làm thay đổi danh mục của module khác.
 *  3. AbortSignal được truyền nguyên vẹn: request có `signal` KHÔNG dùng chung request mạng
 *     với ai khác (để huỷ của bên này không làm hỏng bên kia) — nó chỉ có thể đọc cache TTL.
 *
 * Trong môi trường test (`import.meta.env.MODE === 'test'`) lớp này là pass-through thuần tuý
 * sang `fetch` toàn cục, để các test mock fetch vẫn thấy đúng số lần gọi như trước.
 */

const DEFAULT_LOOKUP_TTL_MS = 30_000;

/**
 * Endpoint tra cứu/danh mục ít thay đổi (dropdown, cây phòng ban, vai trò...). So khớp với
 * pathname SAU tiền tố /api/v1 (hoặc bất kỳ tiền tố nào), không tính query string.
 */
const LOOKUP_ENDPOINTS: RegExp[] = [
  /\/roles$/,
  /\/departments$/,
  /\/departments\/tree$/,
  /\/users\/lookup$/,
  /\/users\/assignable-for-project$/,
  /\/employees\/assignable-users$/,
  /\/timesheet-entries\/lookup-employees$/,
  /\/timesheet-entries\/lookup-candidates$/,
];

interface BufferedResponse {
  body: ArrayBuffer | null;
  status: number;
  statusText: string;
  headers: [string, string][];
}

interface CacheEntry {
  expiresAt: number;
  data: BufferedResponse;
}

const inFlight = new Map<string, Promise<BufferedResponse>>();
const cache = new Map<string, CacheEntry>();
let enabled = import.meta.env.MODE !== 'test';
/** Tăng mỗi lần cache bị xoá: phản hồi của request bắt đầu TRƯỚC một thao tác ghi không được lưu. */
let generation = 0;

/** Chỉ dùng cho unit test của chính module này. */
export function __setHttpOptimizationsEnabled(value: boolean): void {
  enabled = value;
  clearHttpCache();
}

/**
 * Xoá cache TTL (ví dụ khi đăng xuất). Request GET đang chạy vẫn trả kết quả cho các bên đã chờ,
 * nhưng bên gọi mới sẽ không ghép vào chúng nữa và kết quả của chúng không được đưa vào cache.
 */
export function clearHttpCache(): void {
  generation += 1;
  cache.clear();
  inFlight.clear();
}

function headersToPairs(headers: HeadersInit | undefined): [string, string][] {
  if (!headers) return [];
  if (headers instanceof Headers) return Array.from(headers.entries());
  if (Array.isArray(headers)) return headers.map(([k, v]) => [k.toLowerCase(), v]);
  return Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]);
}

function requestKey(url: string, init: RequestInit | undefined): string {
  const pairs = headersToPairs(init?.headers).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `${url}\n${JSON.stringify(pairs)}`;
}

function lookupTtl(url: string): number {
  let pathname: string;
  try {
    pathname = new URL(url, 'http://localhost').pathname.replace(/\/+$/, '');
  } catch {
    return 0;
  }
  return LOOKUP_ENDPOINTS.some((re) => re.test(pathname)) ? DEFAULT_LOOKUP_TTL_MS : 0;
}

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

async function bufferResponse(response: Response): Promise<BufferedResponse> {
  const body = NULL_BODY_STATUSES.has(response.status) ? null : await response.arrayBuffer();
  return {
    body,
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers.entries()),
  };
}

function toResponse(data: BufferedResponse): Response {
  return new Response(data.body ? data.body.slice(0) : null, {
    status: data.status,
    statusText: data.statusText,
    headers: data.headers,
  });
}

function isOk(data: BufferedResponse): boolean {
  return data.status >= 200 && data.status < 300;
}

/**
 * Thay thế trực tiếp cho `fetch(url, init)` trong các hàm requestBackend.
 * Luôn trả về một Response chưa bị đọc body.
 */
export async function httpFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (!enabled) return fetch(url, init);

  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET') {
    // Thao tác ghi: dữ liệu danh mục có thể đã đổi — bỏ cache cả trước lẫn sau khi ghi.
    clearHttpCache();
    try {
      return await fetch(url, init);
    } finally {
      clearHttpCache();
    }
  }

  const key = requestKey(url, init);
  const ttl = lookupTtl(url);

  if (ttl > 0) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return toResponse(hit.data);
    if (hit) cache.delete(key);
  }

  const remember = (data: BufferedResponse) => {
    if (ttl > 0 && isOk(data)) cache.set(key, { expiresAt: Date.now() + ttl, data });
    return data;
  };

  if (init.signal) {
    // Không chia sẻ request có thể bị huỷ riêng; lỗi AbortError được ném nguyên vẹn.
    const startedAt = generation;
    const data = await bufferResponse(await fetch(url, init));
    return toResponse(startedAt === generation ? remember(data) : data);
  }

  let pending = inFlight.get(key);
  if (!pending) {
    const startedAt = generation;
    const request: Promise<BufferedResponse> = fetch(url, init)
      .then(bufferResponse)
      .then((data) => (startedAt === generation ? remember(data) : data))
      .finally(() => {
        if (inFlight.get(key) === request) inFlight.delete(key);
      });
    pending = request;
    inFlight.set(key, pending);
  }
  return toResponse(await pending);
}
