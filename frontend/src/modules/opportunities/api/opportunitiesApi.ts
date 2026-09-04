import type {
  Opportunity,
  OpportunityCreatePayload,
  OpportunityCreateResponse,
  CustomerOption,
} from '../types/opportunityTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class OpportunityApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'OpportunityApiError';
  }
}

async function requestBackend<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new OpportunityApiError(
      'NETWORK_ERROR',
      'Không thể kết nối đến máy chủ backend. Vui lòng kiểm tra lại dịch vụ máy chủ.',
      503
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code =
      payload.errorCode ||
      payload.code ||
      (response.status === 403
        ? 'FORBIDDEN'
        : response.status === 404
        ? 'RESOURCE_NOT_FOUND'
        : response.status === 401
        ? 'UNAUTHORIZED'
        : 'UNKNOWN_ERROR');

    let message = payload.message;

    if (!message) {
      if (response.status === 403) {
        message =
          'Bạn không có quyền thực hiện thao tác này. Chức năng tạo cơ hội bán hàng yêu cầu vai trò Nhân viên kinh doanh (VT-04).';
      } else if (response.status === 404) {
        message = 'Không tìm thấy hồ sơ khách hàng trong hệ thống (TC-01).';
      } else if (response.status === 401) {
        message = 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.';
      } else {
        message = 'Đã xảy ra lỗi khi gửi yêu cầu đến máy chủ.';
      }
    }

    const fieldErrors = Array.isArray(payload.fieldErrors)
      ? payload.fieldErrors
      : Array.isArray(payload.errors)
      ? payload.errors
      : undefined;

    throw new OpportunityApiError(code, message, response.status, fieldErrors);
  }

  return payload as T;
}

/**
 * NCL-03-CN-001: Tạo cơ hội bán hàng mới
 * Yêu cầu vai trò Nhân viên kinh doanh (VT-04).
 */
export async function createOpportunity(payload: OpportunityCreatePayload): Promise<Opportunity> {
  const res = await requestBackend<OpportunityCreateResponse>(`${API_BASE_URL}/opportunities`, {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name.trim(),
      customerId: payload.customerId,
      expectedValue: payload.expectedValue,
      expectedCloseDate: payload.expectedCloseDate ? payload.expectedCloseDate.trim() : null,
      ownerId: payload.ownerId ?? null,
    }),
  });

  return res.data;
}

/**
 * Tải danh sách khách hàng đã có hồ sơ để người dùng lựa chọn trên giao diện
 * Tránh việc phải nhập mã ID thủ công (NCL-03-CN-001 lưu ý cho Frontend).
 *
 * Lưu ý: hàm này KHÔNG nuốt lỗi — nếu backend trả 401/403/5xx thì ném
 * `OpportunityApiError` để giao diện phân biệt được "không có khách hàng nào"
 * với "tải danh sách thất bại". Chỉ trả mảng rỗng khi backend thực sự trả `data: []`.
 */
export async function fetchCustomersForSelect(): Promise<CustomerOption[]> {
  const res = await requestBackend<{ success: boolean; data: CustomerOption[] }>(
    `${API_BASE_URL}/customers`
  );
  if (!res.data || !Array.isArray(res.data)) {
    return [];
  }
  // Chỉ lấy các khách hàng chưa bị gộp (MERGED) nếu có trạng thái
  return res.data
    .filter((c) => c.status !== 'MERGED')
    .map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      status: c.status,
    }));
}
