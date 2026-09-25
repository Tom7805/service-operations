import type {
  InvoiceDetailRes,
  InvoiceFromMilestoneReq,
  InvoiceRes,
  InvoiceStatus,
  InvoiceProposalCreateReq,
  InvoiceProposalRes,
  InvoiceFromProposalReq,
  RecurringScheduleReq,
  RecurringScheduleRes,
  RecurringInvoiceRunReq,
  RecurringInvoiceRunRes,
  DunningRunReq,
  DunningRunRes,
  DunningLogRes,
  ReceivableAgingRes,
  AgingBucket,
} from '../types/invoiceTypes';
import { httpFetch } from '../../../utils/http';
import { buildQueryString } from '../../../utils/buildQueryString';
import type { PageResult } from '../../../types/pagination';

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
    response = await httpFetch(url, { ...options, headers });
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

/** GET /invoices?contractId=&status= — danh sách hóa đơn, lọc theo hợp đồng và/hoặc
 *  trạng thái (lặp lại được: ?status=ISSUED&status=PARTIALLY_PAID). Chỉ Kế toán (VT-05). */
export async function fetchInvoices(contractId?: number, status?: InvoiceStatus[]): Promise<InvoiceDetailRes[]> {
  const params = new URLSearchParams();
  if (contractId != null) params.set('contractId', String(contractId));
  (status ?? []).forEach((s) => params.append('status', s));
  const qs = params.toString();
  return requestBackend<InvoiceDetailRes[]>(`${API_BASE_URL}/invoices${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

/** GET /invoices/{invoiceId} — chi tiết một hóa đơn. */
export async function getInvoice(invoiceId: number): Promise<InvoiceDetailRes> {
  return requestBackend<InvoiceDetailRes>(`${API_BASE_URL}/invoices/${invoiceId}`, { method: 'GET' });
}

/**
 * POST /contracts/{contractId}/milestones/{milestoneId}/invoice — lập hóa đơn từ một
 * mốc thanh toán hợp đồng (NCL-10-CN-002). Body tuỳ chọn — bỏ trống là dùng mặc định
 * (ngày hóa đơn = hôm nay, hạn = +30 ngày). Đây là cách DUY NHẤT chuyển mốc từ
 * READY_TO_INVOICE sang INVOICED (xem ContractMilestonesModal.tsx).
 */
export async function createInvoiceFromMilestone(
  contractId: number,
  milestoneId: number,
  req?: InvoiceFromMilestoneReq
): Promise<InvoiceRes> {
  return requestBackend<InvoiceRes>(`${API_BASE_URL}/contracts/${contractId}/milestones/${milestoneId}/invoice`, {
    method: 'POST',
    body: JSON.stringify(req ?? {}),
  });
}

/**
 * POST /projects/{projectId}/invoice-proposals — gom giờ công + chi phí đã duyệt,
 * tính phí trong một kỳ thành đề xuất hóa đơn (NCL-10-CN-001, chỉ hợp đồng
 * TIME_AND_MATERIAL).
 */
export async function createInvoiceProposal(
  projectId: number,
  req: InvoiceProposalCreateReq
): Promise<InvoiceProposalRes> {
  return requestBackend<InvoiceProposalRes>(`${API_BASE_URL}/projects/${projectId}/invoice-proposals`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/**
 * GET /contracts/{contractId}/invoice-proposals — toàn bộ đề xuất hóa đơn (mọi trạng thái) của một hợp
 * đồng, mới nhất trước. Dùng để hiển thị lại các đề xuất PENDING sau khi tải lại trang (trước đây chỉ
 * thấy được đề xuất vừa tạo, không có cách nào xem lại).
 */
export async function fetchInvoiceProposals(contractId: number): Promise<InvoiceProposalRes[]> {
  return requestBackend<InvoiceProposalRes[]>(`${API_BASE_URL}/contracts/${contractId}/invoice-proposals`, {
    method: 'GET',
  });
}

/**
 * POST /invoice-proposals/{proposalId}/invoice — chuyển một đề xuất đang PENDING thành hóa đơn chính
 * thức. Body tuỳ chọn (mặc định: ngày hóa đơn = hôm nay, hạn = +30 ngày, ghi chú lấy từ đề xuất).
 */
export async function convertProposalToInvoice(
  proposalId: number,
  req?: InvoiceFromProposalReq
): Promise<InvoiceRes> {
  return requestBackend<InvoiceRes>(`${API_BASE_URL}/invoice-proposals/${proposalId}/invoice`, {
    method: 'POST',
    body: JSON.stringify(req ?? {}),
  });
}

/**
 * POST /invoice-proposals/{proposalId}/cancel — hủy một đề xuất đang PENDING (ví dụ tạo nhầm, hoặc
 * muốn gom lại chung với đề xuất khác thành 1 hóa đơn). Giải phóng giờ công/chi phí để lần tạo đề
 * xuất sau gom lại được.
 */
export async function cancelInvoiceProposal(proposalId: number): Promise<InvoiceProposalRes> {
  return requestBackend<InvoiceProposalRes>(`${API_BASE_URL}/invoice-proposals/${proposalId}/cancel`, {
    method: 'POST',
  });
}

/** GET /contracts/{contractId}/recurring-invoice-schedule — lịch hóa đơn định kỳ hiện tại. */
export async function getRecurringSchedule(contractId: number): Promise<RecurringScheduleRes> {
  return requestBackend<RecurringScheduleRes>(
    `${API_BASE_URL}/contracts/${contractId}/recurring-invoice-schedule`,
    { method: 'GET' }
  );
}

/** POST /contracts/{contractId}/recurring-invoice-schedule — tạo lịch hóa đơn định kỳ mới. */
export async function createRecurringSchedule(
  contractId: number,
  req: RecurringScheduleReq
): Promise<RecurringScheduleRes> {
  return requestBackend<RecurringScheduleRes>(
    `${API_BASE_URL}/contracts/${contractId}/recurring-invoice-schedule`,
    { method: 'POST', body: JSON.stringify(req) }
  );
}

/** PUT /contracts/{contractId}/recurring-invoice-schedule — sửa lịch hóa đơn định kỳ. */
export async function updateRecurringSchedule(
  contractId: number,
  req: RecurringScheduleReq
): Promise<RecurringScheduleRes> {
  return requestBackend<RecurringScheduleRes>(
    `${API_BASE_URL}/contracts/${contractId}/recurring-invoice-schedule`,
    { method: 'PUT', body: JSON.stringify(req) }
  );
}

/** POST /recurring-invoices/run — chạy job sinh hóa đơn định kỳ (thủ công hoặc theo asOf). */
export async function runRecurringInvoices(req?: RecurringInvoiceRunReq): Promise<RecurringInvoiceRunRes> {
  return requestBackend<RecurringInvoiceRunRes>(`${API_BASE_URL}/recurring-invoices/run`, {
    method: 'POST',
    body: JSON.stringify(req ?? {}),
  });
}

/** POST /dunning/run — chạy job nhắc thu nợ (thủ công hoặc theo asOf). */
export async function runDunning(req?: DunningRunReq): Promise<DunningRunRes> {
  return requestBackend<DunningRunRes>(`${API_BASE_URL}/dunning/run`, {
    method: 'POST',
    body: JSON.stringify(req ?? {}),
  });
}

/** GET /invoices/{invoiceId}/dunning-logs — lịch sử nhắc thu nợ của một hóa đơn. */
export async function fetchDunningLogs(invoiceId: number): Promise<DunningLogRes[]> {
  return requestBackend<DunningLogRes[]>(`${API_BASE_URL}/invoices/${invoiceId}/dunning-logs`, { method: 'GET' });
}

/** GET /receivables/overdue?customerId=&bucket= — báo cáo tuổi nợ (NCL-10-CN-004). */
export async function fetchReceivableAging(customerId?: number, bucket?: AgingBucket): Promise<ReceivableAgingRes> {
  const params = new URLSearchParams();
  if (customerId != null) params.set('customerId', String(customerId));
  if (bucket) params.set('bucket', bucket);
  const qs = params.toString();
  return requestBackend<ReceivableAgingRes>(`${API_BASE_URL}/receivables/overdue${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export interface InvoicePageQuery {
  keyword?: string;
  status?: string;
}

/** Một trang hóa đơn (GET /invoices/paged), mới nhất trước: tìm theo số HĐ, mã hợp đồng hoặc tên khách hàng. */
export async function fetchInvoicesPage(
  query: InvoicePageQuery,
  page: number,
  size: number
): Promise<PageResult<InvoiceDetailRes>> {
  const qs = buildQueryString({ ...query, page, size });
  return requestBackend<PageResult<InvoiceDetailRes>>(`${API_BASE_URL}/invoices/paged${qs}`, { method: 'GET' });
}
