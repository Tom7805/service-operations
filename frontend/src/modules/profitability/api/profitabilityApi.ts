import type {
  MarginAlertThresholdRes,
  MarginByCustomerRes,
  MarginByEmployeeRes,
  MarginThresholdReq,
  PlannedVsActualMarginRes,
  ProfitForecastRes,
  ProjectLaborCostRes,
  ProjectMarginRes,
  RecognizedRevenueRes,
} from '../types/profitabilityTypes';
import { httpFetch } from '../../../utils/http';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class ProfitabilityApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ProfitabilityApiError';
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
    response = await httpFetch(url, { ...options, headers });
  } catch {
    throw new ProfitabilityApiError(
      'NETWORK_ERROR',
      `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`,
      503
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 403) message = payload.message || 'Bạn không có quyền thực hiện thao tác này.';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      const first = payload.fieldErrors[0];
      message = `${first.message} (${first.field})`;
    }
    throw new ProfitabilityApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/**
 * NCL-09-CN-001: Tính giá vốn giờ công đã duyệt của một dự án.
 *
 * Cho phép VT-01 (Ban giám đốc), VT-02 (Quản lý dự án), VT-05 (Kế toán).
 * GET /projects/{projectId}/profitability/labor-cost
 *
 * `hourlyRate` và `laborCost` trong từng dòng (`LaborCostLineRes`) được backend đánh
 * dấu `@MaskSensitive(COST)` — người có quyền xem dữ liệu lương (VT-01, VT-05, VT-06)
 * nhận giá trị thực; người không có quyền (ví dụ VT-02) nhận giá trị đã mã hoá.
 * Frontend dùng `canViewSensitiveData` để quyết định hiển thị bằng MaskedCell.
 */
export async function getProjectLaborCost(projectId: number): Promise<ProjectLaborCostRes> {
  return requestBackend<ProjectLaborCostRes>(
    `${API_BASE_URL}/projects/${projectId}/profitability/labor-cost`,
    {
      method: 'GET',
    }
  );
}

/**
 * NCL-09-CN-006: So sánh biên lợi nhuận dự kiến (từ báo giá) với thực tế (từ giờ công đã duyệt).
 *
 * GET /projects/{projectId}/profitability/planned-vs-actual-margin
 *
 * Chỉ VT-02 (Quản lý dự án) được truy cập — backend trả `403 FORBIDDEN` cho vai trò khác.
 * Dự án chưa gắn báo giá nào (qua hợp đồng) backend trả `404 RESOURCE_NOT_FOUND`; frontend dùng
 * `ProfitabilityApiError.code === 'RESOURCE_NOT_FOUND'` để hiển thị trạng thái "chưa có báo giá".
 *
 * Khác với `labor-cost` (che chi phí/giờ công theo TỪNG nhân sự qua QTN-02), endpoint này chỉ
 * trả số liệu tổng hợp cấp dự án nên **không** áp dụng masking — frontend hiển thị trực tiếp.
 */
export async function getPlannedVsActualMargin(projectId: number): Promise<PlannedVsActualMarginRes> {
  return requestBackend<PlannedVsActualMarginRes>(
    `${API_BASE_URL}/projects/${projectId}/profitability/planned-vs-actual-margin`,
    {
      method: 'GET',
    }
  );
}

/**
 * NCL-09-CN-002: Tính doanh thu ghi nhận của một dự án theo đúng loại hợp đồng.
 *
 * Cho phép VT-01 (Ban giám đốc), VT-05 (Kế toán) — vai trò khác nhận `403 FORBIDDEN`.
 * GET /projects/{projectId}/profitability/revenue
 *
 * Hợp đồng `MAINTENANCE`/`MILESTONE` chưa được hỗ trợ, trả về `400 INVALID_STATE`
 * (bắn `ProfitabilityApiError` với thông điệp lỗi từ backend).
 */
export async function getProjectRecognizedRevenue(projectId: number): Promise<RecognizedRevenueRes> {
  return requestBackend<RecognizedRevenueRes>(
    `${API_BASE_URL}/projects/${projectId}/profitability/revenue`,
    {
      method: 'GET',
    }
  );
}

/**
 * NCL-09-CN-003: Hiển thị biên lợi nhuận gộp thời gian thực của một dự án.
 *
 * Cho phép VT-01 (Ban giám đốc), VT-02 (Quản lý dự án), VT-05 (Kế toán).
 * GET /projects/{projectId}/profitability/margin
 *
 * `hourlyRate`/`laborCost` trong từng dòng của `laborCostLines` được backend đánh dấu
 * `@MaskSensitive(COST)` — người có quyền xem dữ liệu lương (VT-01, VT-05, VT-06) nhận
 * giá trị thực; người không có quyền (VT-02) nhận giá trị đã mã hoá. Các trường tổng hợp
 * (doanh thu, chi phí, lợi nhuận gộp, tỷ suất) không bị che.
 */
export async function getProjectMargin(projectId: number): Promise<ProjectMarginRes> {
  return requestBackend<ProjectMarginRes>(
    `${API_BASE_URL}/projects/${projectId}/profitability/margin`,
    {
      method: 'GET',
    }
  );
}

/**
 * NCL-09-CN-004: Xem ngưỡng cảnh báo âm biên hiện hành (cấu hình toàn công ty).
 *
 * Cho phép VT-01 (Ban giám đốc), VT-02 (Quản lý dự án), VT-05 (Kế toán).
 * GET /profitability/margin-alert-threshold
 */
export async function getMarginAlertThreshold(): Promise<MarginAlertThresholdRes> {
  return requestBackend<MarginAlertThresholdRes>(`${API_BASE_URL}/profitability/margin-alert-threshold`, {
    method: 'GET',
  });
}

/**
 * NCL-09-CN-004: Đặt/đổi ngưỡng cảnh báo âm biên (TC-03: chỉ VT-01, vai trò khác 403).
 * PUT /profitability/margin-alert-threshold
 */
export async function setMarginAlertThreshold(payload: MarginThresholdReq): Promise<MarginAlertThresholdRes> {
  return requestBackend<MarginAlertThresholdRes>(`${API_BASE_URL}/profitability/margin-alert-threshold`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-09-CN-005 (TC-01): Báo cáo biên lợi nhuận theo khách hàng trong một kỳ.
 *
 * Chỉ VT-01 (Ban giám đốc) — vai trò khác nhận `403 FORBIDDEN`.
 * GET /reports/margin/by-customer?from={yyyy-MM-dd}&to={yyyy-MM-dd}
 */
export async function getMarginByCustomer(from: string, to: string): Promise<MarginByCustomerRes> {
  const params = new URLSearchParams({ from, to });
  return requestBackend<MarginByCustomerRes>(`${API_BASE_URL}/reports/margin/by-customer?${params.toString()}`, {
    method: 'GET',
  });
}

/**
 * NCL-09-CN-005 (TC-02): Báo cáo biên lợi nhuận theo nhân sự trong một kỳ.
 *
 * Chỉ VT-01 (Ban giám đốc) — vai trò khác nhận `403 FORBIDDEN`.
 * GET /reports/margin/by-employee?from={yyyy-MM-dd}&to={yyyy-MM-dd}
 */
export async function getMarginByEmployee(from: string, to: string): Promise<MarginByEmployeeRes> {
  const params = new URLSearchParams({ from, to });
  return requestBackend<MarginByEmployeeRes>(`${API_BASE_URL}/reports/margin/by-employee?${params.toString()}`, {
    method: 'GET',
  });
}

/**
 * NCL-09-CN-007: Dự báo lợi nhuận của dự án tới khi kết thúc.
 *
 * GET /projects/{projectId}/profitability/profit-forecast
 *
 * Chỉ VT-02 (Quản lý dự án) — vai trò khác nhận `403 FORBIDDEN` (đồng thời backend ghi nhật ký từ chối).
 * Chỉ trả số liệu tổng hợp cấp dự án nên không áp dụng che dữ liệu QTN-02.
 */
export async function getProfitForecast(projectId: number): Promise<ProfitForecastRes> {
  return requestBackend<ProfitForecastRes>(
    `${API_BASE_URL}/projects/${projectId}/profitability/profit-forecast`,
    {
      method: 'GET',
    }
  );
}
