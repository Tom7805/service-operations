import type { AgingBucket, ReceivableAgingRes } from '../types/invoiceTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class InvoicesApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode?: number) {
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
    if (response.status === 403) message = 'Bạn không có quyền thực hiện thao tác này.';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    throw new InvoicesApiError(code, message, response.status);
  }

  return payload.data as T;
}

/**
 * GET /receivables/overdue — hóa đơn quá hạn thanh toán tại hôm nay, phân nhóm theo
 * số ngày quá hạn (NCL-10-CN-004). Chỉ đọc, không có công nợ quá hạn vẫn trả 200.
 */
export async function fetchReceivableAging(customerId?: number, bucket?: AgingBucket): Promise<ReceivableAgingRes> {
  const params = new URLSearchParams();
  if (customerId != null) params.set('customerId', String(customerId));
  if (bucket) params.set('bucket', bucket);
  const qs = params.toString();
  return requestBackend<ReceivableAgingRes>(`${API_BASE_URL}/receivables/overdue${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}
