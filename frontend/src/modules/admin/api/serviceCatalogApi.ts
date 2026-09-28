import type {
  ServiceCatalogCreateReq,
  ServiceCatalogRes,
  ServiceCatalogSearchParams,
  ServiceCatalogUpdateReq,
  ServicePriceReq,
} from '../types/adminTypes';
import { API_BASE_URL, requestBackend } from './adminHttp';

export { AdminApiError } from './adminHttp';
export type { FieldError } from './adminHttp';

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
