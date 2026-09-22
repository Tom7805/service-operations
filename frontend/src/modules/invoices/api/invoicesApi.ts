import type { InvoiceProposalCreateReq, InvoiceProposalRes } from '../types/invoiceTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class InvoicesApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'InvoicesApiError';
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
    throw new InvoicesApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
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
    throw new InvoicesApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/**
 * NCL-10-CN-001: tạo đề nghị xuất hóa đơn từ giờ công đã duyệt của một dự án trong một kỳ.
 * Chỉ Kế toán (VT-05) và chỉ áp dụng cho hợp đồng theo giờ (`TIME_AND_MATERIAL`) — backend trả
 * `400 INVALID_STATE` cho loại hợp đồng khác hoặc khi kỳ không có dòng nào đủ điều kiện.
 * POST /projects/{projectId}/invoice-proposals
 */
export async function createInvoiceProposal(
  projectId: number,
  payload: InvoiceProposalCreateReq
): Promise<InvoiceProposalRes> {
  return requestBackend<InvoiceProposalRes>(`${API_BASE_URL}/projects/${projectId}/invoice-proposals`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
