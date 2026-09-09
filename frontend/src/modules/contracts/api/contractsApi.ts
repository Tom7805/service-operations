import type {
  ContractRes,
  ContractType,
  ContractMilestoneRes,
  ContractMilestoneInput,
  ContractUsageRes,
  ContractExpiryAlertRes,
  RenewalCreateReq,
  RenewalRes,
} from '../types/contractTypes';

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

export type ContractAppendixCreatePayload = {
  content: string;
  adjustmentValue: number;
  effectiveDate: string;
};

export type ContractAppendixRes = {
  id: number;
  contractId: number;
  content: string;
  adjustmentValue: number;
  valueBefore: number;
  valueAfter: number;
  effectiveDate: string;
  createdBy: string;
  createdAt: string;
};

/** GET /contracts/{contractId} — nạp giá trị hiện tại trước khi khai báo loại/hạn mức. */
export async function getContract(contractId: number): Promise<ContractRes> {
  return requestBackend<ContractRes>(`${API_BASE_URL}/contracts/${contractId}`, {
    method: 'GET',
  });
}

/** POST /contracts/{contractId}/appendices — lập phụ lục điều chỉnh hợp đồng (NCL-04-CN-004). */
export async function createAppendix(
  contractId: number,
  payload: ContractAppendixCreatePayload
): Promise<ContractAppendixRes> {
  return requestBackend<ContractAppendixRes>(`${API_BASE_URL}/contracts/${contractId}/appendices`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** GET /contracts/{contractId}/appendices — lịch sử phụ lục của hợp đồng. */
export async function fetchAppendices(contractId: number): Promise<ContractAppendixRes[]> {
  return requestBackend<ContractAppendixRes[]>(`${API_BASE_URL}/contracts/${contractId}/appendices`, {
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

/** GET /contracts/{contractId}/milestones — danh sách mốc theo ngày dự kiến tăng dần (NCL-04-CN-003). */
export async function fetchMilestones(contractId: number): Promise<ContractMilestoneRes[]> {
  return requestBackend<ContractMilestoneRes[]>(`${API_BASE_URL}/contracts/${contractId}/milestones`, {
    method: 'GET',
  });
}

/**
 * PUT /contracts/{contractId}/milestones — thay thế TRỌN BỘ danh sách mốc trong
 * một giao dịch (không có API tạo/sửa/xóa từng mốc riêng lẻ). Backend từ chối
 * nếu tổng khác giá trị hợp đồng và không thay đổi dữ liệu cũ (NCL-04-CN-003, QTN-19).
 */
export async function replaceMilestones(
  contractId: number,
  milestones: ContractMilestoneInput[]
): Promise<ContractMilestoneRes[]> {
  return requestBackend<ContractMilestoneRes[]>(`${API_BASE_URL}/contracts/${contractId}/milestones`, {
    method: 'PUT',
    body: JSON.stringify(milestones),
  });
}

/**
 * GET /contracts/{contractId}/usage — thông tin mức độ sử dụng hạn mức và cảnh báo
 * khi sắp vượt hạn mức (ngưỡng 80%) hoặc đã vượt (NCL-04-CN-005, QTN-19).
 * Yêu cầu vai trò VT-02 (Quản lý dự án) hoặc VT-05 (Kế toán).
 */
export async function getContractUsage(contractId: number): Promise<ContractUsageRes> {
  return requestBackend<ContractUsageRes>(`${API_BASE_URL}/contracts/${contractId}/usage`, {
    method: 'GET',
  });
}

export const fetchContractUsage = getContractUsage;

/**
 * GET /contracts/expiring?days=30 — danh sách hợp đồng đang hiệu lực sắp hết hạn
 * trong vòng `days` ngày (mặc định 30), sắp xếp theo ngày hết hạn gần nhất trước.
 * Yêu cầu vai trò Kế toán (VT-05) (NCL-04-CN-006).
 */
export async function fetchExpiringContracts(days: number = 30): Promise<ContractExpiryAlertRes[]> {
  if (days < 0) {
    throw new ContractsApiError('VALIDATION_ERROR', 'Số ngày rà soát không được âm.', 400);
  }
  return requestBackend<ContractExpiryAlertRes[]>(`${API_BASE_URL}/contracts/expiring?days=${days}`, {
    method: 'GET',
  });
}

export const getExpiringContracts = fetchExpiringContracts;

/** POST /contracts/{contractId}/renewals — Gia hạn hợp đồng đang hiệu lực (NCL-04-CN-007). */
export async function createRenewal(
  contractId: number,
  payload: RenewalCreateReq
): Promise<RenewalRes> {
  return requestBackend<RenewalRes>(`${API_BASE_URL}/contracts/${contractId}/renewals`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** GET /contracts/{contractId}/renewals — Xem lịch sử gia hạn của hợp đồng (NCL-04-CN-007). */
export async function fetchRenewals(contractId: number): Promise<RenewalRes[]> {
  return requestBackend<RenewalRes[]>(`${API_BASE_URL}/contracts/${contractId}/renewals`, {
    method: 'GET',
  });
}

export default {} as unknown as {
  getContract: typeof getContract;
  updateTypeAndLimit: typeof updateTypeAndLimit;
  createAppendix: typeof createAppendix;
  fetchAppendices: typeof fetchAppendices;
  fetchMilestones: typeof fetchMilestones;
  replaceMilestones: typeof replaceMilestones;
  getContractUsage: typeof getContractUsage;
  fetchContractUsage: typeof fetchContractUsage;
  fetchExpiringContracts: typeof fetchExpiringContracts;
  getExpiringContracts: typeof getExpiringContracts;
  createRenewal: typeof createRenewal;
  fetchRenewals: typeof fetchRenewals;
};
