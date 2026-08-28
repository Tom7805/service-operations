import type {
  Customer,
  CustomerCreatePayload,
  CustomerCreateWithOverridePayload,
  CustomerOverview,
  DuplicateCandidate,
  CustomerContact,
  CustomerContactPayload,
} from '../types/customerTypes';

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
        message = 'Bạn không có quyền thực hiện thao tác này. Chức năng yêu cầu vai trò Nhân viên kinh doanh (VT-04) hoặc Quản lý dự án (VT-02).';
      } else if (response.status === 401) {
        message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (response.status === 409) {
        message = 'Hệ thống phát hiện hồ sơ khách hàng đã có độ trùng lặp cao (NCL-02-CN-002). Vui lòng xác nhận tạo mới kèm lý do.';
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

function cleanCustomerPayload(payload: CustomerCreatePayload): CustomerCreatePayload {
  return {
    name: payload.name.trim(),
    taxCode: payload.taxCode?.trim() || undefined,
    phone: payload.phone?.trim() || undefined,
    industry: payload.industry?.trim() || undefined,
    address: payload.address?.trim() || undefined,
  };
}

/**
 * NCL-02-CN-001 (bước D/P): Lấy danh sách hồ sơ khách hàng hiện có trong hệ thống (GET /customers).
 * Hỗ trợ tìm theo tên, mã KH (KH-xxxxxx), MST hoặc SĐT qua tham số `keyword` (lọc phía máy chủ).
 * Bắt buộc vai trò VT-04 hoặc VT-02.
 */
export async function fetchCustomers(keyword?: string): Promise<Customer[]> {
  const url = new URL(`${API_BASE_URL}/customers`);
  if (keyword && keyword.trim()) {
    url.searchParams.append('keyword', keyword.trim());
  }
  return requestBackend<Customer[]>(url.toString(), { method: 'GET' });
}

/**
 * NCL-02-CN-001: Tạo hồ sơ khách hàng mới (POST /customers)
 * Backend tự sinh mã `code` dạng `KH-xxxxxx`.
 */
export async function createCustomer(payload: CustomerCreatePayload): Promise<Customer> {
  const cleanPayload = cleanCustomerPayload(payload);

  return requestBackend<Customer>(`${API_BASE_URL}/customers`, {
    method: 'POST',
    body: JSON.stringify(cleanPayload),
  });
}

/**
 * NCL-02-CN-002: Kiểm tra hồ sơ mới có nghi trùng với hồ sơ đã có không (POST /customers/check-duplicate)
 * Trả về danh sách ứng viên nghi trùng kèm mức độ tương đồng và các trường khớp.
 */
export async function checkCustomerDuplicate(
  payload: CustomerCreatePayload
): Promise<DuplicateCandidate[]> {
  const cleanPayload = cleanCustomerPayload(payload);

  return requestBackend<DuplicateCandidate[]>(`${API_BASE_URL}/customers/check-duplicate`, {
    method: 'POST',
    body: JSON.stringify(cleanPayload),
  });
}

/**
 * NCL-02-CN-002: Xác nhận tạo mới hồ sơ khách hàng bỏ qua cảnh báo trùng (POST /customers/create-with-override)
 * Bắt buộc truyền kèm lý do (override.reason).
 */
export async function createCustomerWithOverride(
  payload: CustomerCreateWithOverridePayload
): Promise<Customer> {
  const cleanPayload: CustomerCreateWithOverridePayload = {
    customer: cleanCustomerPayload(payload.customer),
    override: {
      reason: payload.override.reason.trim(),
    },
  };

  return requestBackend<Customer>(`${API_BASE_URL}/customers/create-with-override`, {
    method: 'POST',
    body: JSON.stringify(cleanPayload),
  });
}

/**
 * NCL-02-CN-004 (TC-01): Lấy hồ sơ tổng hợp của một khách hàng (GET /customers/{id}/overview).
 * Trả về khách hàng + cơ hội, hợp đồng, dự án, hóa đơn, công nợ — mỗi nhóm đã sắp theo thứ tự thời gian.
 * Bắt buộc vai trò VT-04 hoặc VT-02; mỗi lần gọi Backend ghi Audit Log (TC-03).
 * 403 → không đủ quyền · 404 → không tìm thấy hồ sơ khách hàng.
 */
export async function fetchCustomerOverview(customerId: number): Promise<CustomerOverview> {
  return requestBackend<CustomerOverview>(`${API_BASE_URL}/customers/${customerId}/overview`, {
    method: 'GET',
  });
}

/**
 * NCL-02-CN-003 (TC-01, TC-03): Lấy danh sách người liên hệ của khách hàng
 * Backend tự động đưa đầu mối chính lên đầu danh sách.
 * Bắt buộc vai trò VT-04.
 */
export async function fetchCustomerContacts(customerId: number): Promise<CustomerContact[]> {
  return requestBackend<CustomerContact[]>(`${API_BASE_URL}/customers/${customerId}/contacts`, {
    method: 'GET',
  });
}

/**
 * NCL-02-CN-003 (TC-01, TC-03): Thêm người liên hệ cho khách hàng
 * Bắt buộc vai trò VT-04.
 */
export async function addCustomerContact(
  customerId: number,
  payload: CustomerContactPayload
): Promise<CustomerContact> {
  const cleanPayload = {
    fullName: payload.fullName.trim(),
    title: payload.title?.trim() || undefined,
    email: payload.email?.trim() || undefined,
    phone: payload.phone?.trim() || undefined,
    isPrimary: Boolean(payload.isPrimary),
  };

  return requestBackend<CustomerContact>(`${API_BASE_URL}/customers/${customerId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(cleanPayload),
  });
}

/**
 * NCL-02-CN-003 (TC-02, TC-03): Đặt người liên hệ làm đầu mối chính
 * Backend tự động chuyển đầu mối cũ thành đầu mối phụ và chỉ giữ 1 đầu mối chính.
 * Bắt buộc vai trò VT-04.
 */
export async function setPrimaryCustomerContact(
  customerId: number,
  contactId: number
): Promise<CustomerContact> {
  return requestBackend<CustomerContact>(
    `${API_BASE_URL}/customers/${customerId}/contacts/${contactId}/primary`,
    {
      method: 'PATCH',
    }
  );
}

