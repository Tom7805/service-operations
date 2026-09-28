import type { PaymentCreateReq, PaymentItemRes, PaymentRes } from '../types/invoiceTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class PaymentsApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'PaymentsApiError';
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
    throw new PaymentsApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 403) message = 'Bạn không có quyền thực hiện thao tác này.';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    throw new PaymentsApiError(code, message, response.status);
  }

  return payload.data as T;
}

/** GET /invoices/{invoiceId}/payments — lịch sử thanh toán, mới nhất trước (NCL-10-CN-003). */
export async function fetchPayments(invoiceId: number): Promise<PaymentItemRes[]> {
  return requestBackend<PaymentItemRes[]>(`${API_BASE_URL}/invoices/${invoiceId}/payments`, { method: 'GET' });
}

/**
 * POST /invoices/{invoiceId}/payments — ghi nhận một khoản khách hàng đã thanh toán.
 * Backend tự cập nhật trạng thái hóa đơn (PARTIALLY_PAID/PAID) theo số tiền còn lại,
 * response trả kèm số dư mới nên không cần gọi lại getInvoice sau khi lưu.
 */
export async function createPayment(invoiceId: number, req: PaymentCreateReq): Promise<PaymentRes> {
  return requestBackend<PaymentRes>(`${API_BASE_URL}/invoices/${invoiceId}/payments`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}
