import type { MarginByCustomerRes, MarginByEmployeeRes } from '../types/profitabilityTypes';

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
    response = await fetch(url, { ...options, headers });
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
