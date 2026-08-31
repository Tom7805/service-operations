import type { Opportunity, OpportunityCreatePayload, OpportunityStage, PipelineStage } from '../types/opportunityTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class OpportunityApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number
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
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new OpportunityApiError('NETWORK_ERROR', 'Không thể kết nối đến máy chủ Backend.', 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message;
    if (!message) {
      message =
        response.status === 403
          ? 'Bạn không có quyền thực hiện thao tác này. Chức năng yêu cầu vai trò Nhân viên kinh doanh (VT-04) hoặc Quản lý dự án (VT-02).'
          : response.status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    }
    throw new OpportunityApiError(code, message, response.status);
  }

  return payload.data as T;
}

/** Toàn bộ pipeline nhóm theo giai đoạn — nguồn dữ liệu cho bảng Kanban. */
export async function fetchPipeline(): Promise<PipelineStage[]> {
  return requestBackend<PipelineStage[]>(`${API_BASE_URL}/opportunities/pipeline`);
}

export async function createOpportunity(payload: OpportunityCreatePayload): Promise<Opportunity> {
  return requestBackend<Opportunity>(`${API_BASE_URL}/opportunities`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Chuyển một cơ hội sang giai đoạn khác. */
export async function changeOpportunityStage(id: number, stage: OpportunityStage): Promise<Opportunity> {
  return requestBackend<Opportunity>(`${API_BASE_URL}/opportunities/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage }),
  });
}
