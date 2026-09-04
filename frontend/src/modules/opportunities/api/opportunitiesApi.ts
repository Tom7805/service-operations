const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

import type { OpportunityActivity, OpportunityActivityCreatePayload } from '../types/opportunityTypes';

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
      'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại dịch vụ máy chủ.',
      503
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message;

    if (!message) {
      if (response.status === 403) {
        message = 'Bạn không có quyền thực hiện thao tác này. Chỉ Nhân viên kinh doanh (VT-04) mới được ghi nhận hoạt động chăm sóc.';
      } else if (response.status === 401) {
        message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (response.status === 400) {
        message = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.';
      } else {
        message = 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
      }
    }

    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      const firstFieldErr = payload.fieldErrors[0];
      message = `${firstFieldErr.message} (${firstFieldErr.field})`;
    }

    throw new OpportunityApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

export async function fetchOpportunityActivities(opportunityId: number): Promise<OpportunityActivity[]> {
  return requestBackend<OpportunityActivity[]>(`${API_BASE_URL}/opportunities/${opportunityId}/activities`, {
    method: 'GET',
  });
}

export async function createOpportunityActivity(
  opportunityId: number,
  payload: OpportunityActivityCreatePayload
): Promise<OpportunityActivity> {
  return requestBackend<OpportunityActivity>(`${API_BASE_URL}/opportunities/${opportunityId}/activities`, {
    method: 'POST',
    body: JSON.stringify({
      activityType: payload.activityType,
      occurredAt: payload.occurredAt,
      participants: payload.participants?.trim() || undefined,
      content: payload.content.trim(),
    }),
  });
}
