import type {
  ServiceCatalogCreateReq,
  ServiceCatalogRes,
  ServiceCatalogSearchParams,
  ServiceCatalogUpdateReq,
  ServicePriceReq,
} from '../types/adminTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export interface FieldError {
  field: string;
  message: string;
}

export class AdminApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors: FieldError[] = []
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

async function requestBackend<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new AdminApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (response.status === 403) message = 'Bạn không có quyền thực hiện thao tác này.';
    throw new AdminApiError(code, message, response.status, payload.fieldErrors ?? []);
  }

  return payload.data as T;
}

const BASE = `${API_BASE_URL}/service-catalog`;

/**
 * Danh sách dịch vụ, sắp theo tên (NCL-15-CN-001). Chỉ VT-07 — vai trò khác nhận `403` và backend
 * ghi nhật ký "Từ chối truy cập" (TC-03), nên màn hình luôn gọi API thật thay vì tự chặn.
 * GET /service-catalog?keyword=&active=&asOf=
 */
export async function searchServiceCatalog(params: ServiceCatalogSearchParams = {}): Promise<ServiceCatalogRes[]> {
  const q = new URLSearchParams();
  if (params.keyword?.trim()) q.set('keyword', params.keyword.trim());
  if (params.active !== undefined) q.set('active', String(params.active));
  if (params.asOf) q.set('asOf', params.asOf);
  const qs = q.toString();
  return requestBackend<ServiceCatalogRes[]>(qs ? `${BASE}?${qs}` : BASE, { method: 'GET' });
}

/** Chi tiết + lịch sử mốc giá. GET /service-catalog/{id}?asOf= — `404` nếu không tồn tại. */
export async function getServiceCatalogItem(id: number, asOf?: string): Promise<ServiceCatalogRes> {
  const qs = asOf ? `?asOf=${encodeURIComponent(asOf)}` : '';
  return requestBackend<ServiceCatalogRes>(`${BASE}/${id}${qs}`, { method: 'GET' });
}

/** Tạo dịch vụ kèm mốc giá đầu tiên (TC-01). `409 DUPLICATE_DATA` nếu trùng tên (TC-02). */
export async function createServiceCatalogItem(payload: ServiceCatalogCreateReq): Promise<ServiceCatalogRes> {
  return requestBackend<ServiceCatalogRes>(BASE, { method: 'POST', body: JSON.stringify(payload) });
}

/** Sửa tên/đơn vị/mô tả — không sửa giá. `409` nếu tên mới trùng dịch vụ khác. */
export async function updateServiceCatalogItem(id: number, payload: ServiceCatalogUpdateReq): Promise<ServiceCatalogRes> {
  return requestBackend<ServiceCatalogRes>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

/** Ngừng / mở lại dịch vụ. `400 INVALID_STATE` nếu đặt đúng trạng thái đang có. */
export async function setServiceCatalogStatus(id: number, active: boolean): Promise<ServiceCatalogRes> {
  return requestBackend<ServiceCatalogRes>(`${BASE}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

/** Thêm mốc giá mới (QTN-28) — mốc cũ giữ nguyên. `409` nếu đã có mốc cùng ngày hiệu lực. */
export async function addServicePrice(id: number, payload: ServicePriceReq): Promise<ServiceCatalogRes> {
  return requestBackend<ServiceCatalogRes>(`${BASE}/${id}/prices`, { method: 'POST', body: JSON.stringify(payload) });
}
