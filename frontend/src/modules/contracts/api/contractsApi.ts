const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';
import type {
  MilestoneRes,
  MilestoneCreatePayload,
  MilestoneUpdatePayload,
} from '../types/contractTypes';

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
  } catch (e) {
    throw new ContractsApiError('NETWORK_ERROR', 'Không thể kết nối đến Backend', 503);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || 'UNKNOWN_ERROR';
    const message = payload.message || 'Lỗi khi gọi API hợp đồng/mốc';
    throw new ContractsApiError(code, message, response.status);
  }

  return (payload.data ?? payload) as T;
}

export async function fetchMilestones(contractId: number): Promise<MilestoneRes[]> {
  return requestBackend<MilestoneRes[]>(`${API_BASE_URL}/contracts/${contractId}/milestones`, {
    method: 'GET',
  });
}

export async function fetchContractBasic(contractId: number): Promise<{ id: number; value: number }> {
  return requestBackend<{ id: number; value: number }>(`${API_BASE_URL}/contracts/${contractId}`, {
    method: 'GET',
  });
}

export async function createMilestone(
  contractId: number,
  payload: MilestoneCreatePayload
): Promise<MilestoneRes> {
  return requestBackend<MilestoneRes>(`${API_BASE_URL}/contracts/${contractId}/milestones`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMilestone(
  contractId: number,
  milestoneId: number,
  payload: MilestoneUpdatePayload
): Promise<MilestoneRes> {
  return requestBackend<MilestoneRes>(`${API_BASE_URL}/contracts/${contractId}/milestones/${milestoneId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteMilestone(contractId: number, milestoneId: number): Promise<void> {
  await requestBackend<void>(`${API_BASE_URL}/contracts/${contractId}/milestones/${milestoneId}`, {
    method: 'DELETE',
  });
}
