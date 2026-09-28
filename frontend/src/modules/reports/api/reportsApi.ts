import type { PipelineReportRes } from '../types/pipelineReportTypes';
import type {
  DashboardSummaryRes,
  ExportedReportFile,
  MonthlyRevenueReportRes,
  ReportExportReq,
  TimesheetByEmployeeRes,
} from '../types/reportTypes';
import type { UtilizationReportRes } from '../types/utilizationReportTypes';
import type {
  ProjectPerformanceReportRes,
  ProjectPerformanceStatus,
} from '../types/projectPerformanceReportTypes';

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

/** NCL-11-CN-002: tỷ lệ giờ tính phí của kỳ theo toàn công ty, từng bộ phận và từng người (VT-01). */
export async function getUtilizationReport(from: string, to: string): Promise<UtilizationReportRes> {
  const params = new URLSearchParams({ from, to });
  return requestBackend<UtilizationReportRes>(`${API_BASE_URL}/reports/utilization?${params.toString()}`, {
    method: 'GET',
  });
}

/** NCL-11-CN-003: kế hoạch báo giá so với thực tế của các dự án đang quản lý (VT-02). */
export async function getProjectPerformanceReport(
  status?: ProjectPerformanceStatus
): Promise<ProjectPerformanceReportRes> {
  const params = status ? `?${new URLSearchParams({ status }).toString()}` : '';
  return requestBackend<ProjectPerformanceReportRes>(`${API_BASE_URL}/reports/project-performance${params}`, {
    method: 'GET',
  });
}

/** NCL-11-CN-005 — doanh thu ghi nhận theo tháng; `fromMonth`/`toMonth` dạng yyyy-MM, tối đa 36 tháng. */
export async function getMonthlyRevenue(fromMonth: string, toMonth: string): Promise<MonthlyRevenueReportRes> {
  const params = new URLSearchParams({ fromMonth, toMonth });
  return requestBackend<MonthlyRevenueReportRes>(`${API_BASE_URL}/reports/revenue/monthly?${params.toString()}`, {
    method: 'GET',
  });
}

/** NCL-11-CN-006 — lưới giờ công người × dự án; `from`/`to` dạng yyyy-MM-dd, gồm cả hai đầu. */
export async function getTimesheetReport(from: string, to: string): Promise<TimesheetByEmployeeRes> {
  const params = new URLSearchParams({ from, to });
  return requestBackend<TimesheetByEmployeeRes>(`${API_BASE_URL}/reports/timesheet?${params.toString()}`, {
    method: 'GET',
  });
}

/** Tên tệp trong Content-Disposition — ưu tiên `filename*` (UTF-8) rồi mới tới `filename`. */
export function parseFileName(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/"/g, ''));
    } catch {
      /* rơi xuống filename thường */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1].trim() : fallback;
}

/**
 * NCL-11-CN-004 — tải tệp báo cáo của kỳ đã chọn. Thành công trả nội dung tệp (không phải JSON),
 * lỗi (kỳ không có dữ liệu, không có quyền, kỳ sai) vẫn là JSON lỗi chuẩn nên phải đọc riêng.
 */
export async function exportReport(req: ReportExportReq): Promise<ExportedReportFile> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const params = new URLSearchParams({
    reportType: req.reportType,
    from: req.from,
    to: req.to,
    format: req.format ?? 'CSV',
  });

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/reports/export?${params.toString()}`, { method: 'GET', headers });
  } catch {
    throw new ReportsApiError(
      'NETWORK_ERROR',
      `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`,
      503
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ReportsApiError(
      payload.errorCode || 'UNKNOWN_ERROR',
      payload.message || 'Không xuất được báo cáo.',
      response.status
    );
  }

  const blob = await response.blob();
  const fallback = `bao-cao_${req.from}_${req.to}.csv`;
  const rowCount = Number(response.headers.get('X-Report-Row-Count') ?? '0');
  return {
    blob,
    fileName: parseFileName(response.headers.get('Content-Disposition'), fallback),
    rowCount: Number.isFinite(rowCount) ? rowCount : 0,
  };
}

/** Kích hoạt tải tệp trong trình duyệt. */
export function downloadFile(file: ExportedReportFile): void {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export { ReportsApiError };
