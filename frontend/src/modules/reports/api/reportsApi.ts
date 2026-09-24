import type { PipelineReportRes } from '../types/pipelineReportTypes';
import type { DashboardSummaryRes } from '../types/reportTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

class ReportsApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'ReportsApiError';
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
    throw new ReportsApiError(
      'NETWORK_ERROR',
      `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`,
      503
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || 'UNKNOWN_ERROR';
    const message = payload.message || 'Đã có lỗi khi gọi dịch vụ Backend.';
    throw new ReportsApiError(code, message, response.status);
  }

  return payload.data as T;
}

export async function getPipelineReport(): Promise<PipelineReportRes> {
  return requestBackend<PipelineReportRes>(`${API_BASE_URL}/opportunities/pipeline-report`, {
    method: 'GET',
  });
}

/** NCL-11-CN-001: các chỉ số chính của kỳ chọn cho Ban giám đốc (VT-01). */
export async function getDashboardSummary(from: string, to: string): Promise<DashboardSummaryRes> {
  const params = new URLSearchParams({ from, to });
  return requestBackend<DashboardSummaryRes>(`${API_BASE_URL}/reports/dashboard?${params.toString()}`, {
    method: 'GET',
  });
}

export { ReportsApiError };
