const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

import type { OpportunityActivity, OpportunityActivityCreatePayload } from '../types/opportunityTypes';
import { requestBackend } from '../../../utils/httpClient';

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

function defaultMessage(statusCode: number): string {
  if (statusCode === 403) {
    return 'Bạn không có quyền thực hiện thao tác này. Chỉ Nhân viên kinh doanh (VT-04) mới được ghi nhận hoạt động chăm sóc.';
  }
  if (statusCode === 401) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }
  if (statusCode === 400) {
    return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.';
  }
  return 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
}

export async function fetchOpportunityActivities(opportunityId: number): Promise<OpportunityActivity[]> {
  return requestBackend<OpportunityActivity[], OpportunityApiError>(
    `${API_BASE_URL}/opportunities/${opportunityId}/activities`,
    OpportunityApiError,
    defaultMessage,
    { method: 'GET' }
  );
}

export async function createOpportunityActivity(
  opportunityId: number,
  payload: OpportunityActivityCreatePayload
): Promise<OpportunityActivity> {
  return requestBackend<OpportunityActivity, OpportunityApiError>(
    `${API_BASE_URL}/opportunities/${opportunityId}/activities`,
    OpportunityApiError,
    defaultMessage,
    {
      method: 'POST',
      body: JSON.stringify({
        activityType: payload.activityType,
        occurredAt: payload.occurredAt,
        participants: payload.participants?.trim() || undefined,
        content: payload.content.trim(),
      }),
    }
  );
}
