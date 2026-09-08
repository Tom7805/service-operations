import type { ContractRes, ContractType } from '../types/contractTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class ContractsApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'ContractsApiError';
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
    throw new ContractsApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 403) message = 'Bạn không có quyền thực hiện thao tác này.';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    throw new ContractsApiError(code, message, response.status);
  }

  return payload.data as T;
}

export type ContractTypeLimitPayload = {
  contractType: ContractType;
  totalValue?: number | null;
  limitValue?: number | null;
};

/** GET /contracts/{contractId} — nạp giá trị hiện tại trước khi khai báo loại/hạn mức. */
export async function getContract(contractId: number): Promise<ContractRes> {
  return requestBackend<ContractRes>(`${API_BASE_URL}/contracts/${contractId}`, {
    method: 'GET',
  });
}

/** PATCH /contracts/{contractId}/type-limit */
export async function updateTypeAndLimit(contractId: number, payload: ContractTypeLimitPayload): Promise<ContractRes> {
  return requestBackend<ContractRes>(`${API_BASE_URL}/contracts/${contractId}/type-limit`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export default {} as unknown as { getContract: typeof getContract; updateTypeAndLimit: typeof updateTypeAndLimit };
