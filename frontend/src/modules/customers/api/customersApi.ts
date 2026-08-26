import type { Customer, CustomerCreatePayload } from '../types/customerTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class CustomerApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'CustomerApiError';
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
    throw new CustomerApiError(
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
        message = 'Bạn không có quyền tạo hồ sơ khách hàng. Chức năng yêu cầu vai trò Nhân viên kinh doanh (VT-04) hoặc Quản lý dự án (VT-02).';
      } else if (response.status === 401) {
        message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (response.status === 400) {
        message = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường thông tin.';
      } else {
        message = 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
      }
    }

    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      const firstFieldErr = payload.fieldErrors[0];
      message = `${firstFieldErr.message} (${firstFieldErr.field})`;
    }

    throw new CustomerApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/**
 * NCL-02-CN-001: Tạo hồ sơ khách hàng mới (POST /customers)
 * Backend tự sinh mã `code` dạng `KH-xxxxxx`.
 */
export async function createCustomer(payload: CustomerCreatePayload): Promise<Customer> {
  const cleanPayload: CustomerCreatePayload = {
    name: payload.name.trim(),
    taxCode: payload.taxCode?.trim() || undefined,
    industry: payload.industry?.trim() || undefined,
    address: payload.address?.trim() || undefined,
  };

  return requestBackend<Customer>(`${API_BASE_URL}/customers`, {
    method: 'POST',
    body: JSON.stringify(cleanPayload),
  });
}
