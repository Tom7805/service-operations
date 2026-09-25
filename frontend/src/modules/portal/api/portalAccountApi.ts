import type { AuditLogEntry, AuditLogPage } from '../../auditLog/types/auditLogTypes';
import type {
  PortalAccountCreateReq,
  PortalAccountRes,
  PortalAccountSearchParams,
  PortalAccountStatusReq,
  PortalContactCandidateRes,
} from '../types/portalAccountTypes';
import {
  PORTAL_ACCESS_DENIED_ACTION,
  PORTAL_ACCOUNT_AUDIT_ACTIONS,
  PORTAL_ACCOUNT_FEATURE_LABEL,
} from '../types/portalAccountTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class PortalAccountApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'PortalAccountApiError';
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
    throw new PortalAccountApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 403) {
      message = 'Bạn không có quyền thực hiện thao tác này — tài khoản cổng khách hàng chỉ do Quản trị viên cấp và quản lý.';
    }
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      message = payload.fieldErrors.map((f: { message: string }) => f.message).join('; ');
    }
    throw new PortalAccountApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/**
 * GET /portal-accounts/candidates?customerId= — người liên hệ của khách hàng kèm tài khoản cổng đã cấp (nếu có),
 * đầu mối chính đứng đầu. Dùng để chọn người được cấp (TC-01).
 */
export async function fetchPortalCandidates(customerId: number): Promise<PortalContactCandidateRes[]> {
  return requestBackend<PortalContactCandidateRes[]>(
    `${API_BASE_URL}/portal-accounts/candidates?customerId=${encodeURIComponent(customerId)}`,
    { method: 'GET' }
  );
}

/** POST /portal-accounts — cấp tài khoản cổng cho một người liên hệ; khách hàng suy ra từ người liên hệ (TC-01). */
export async function createPortalAccount(req: PortalAccountCreateReq): Promise<PortalAccountRes> {
  return requestBackend<PortalAccountRes>(`${API_BASE_URL}/portal-accounts`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** GET /portal-accounts?customerId=&status= — danh sách tài khoản cổng, mới nhất trước. */
export async function fetchPortalAccounts(params: PortalAccountSearchParams = {}): Promise<PortalAccountRes[]> {
  const query = new URLSearchParams();
  if (params.customerId != null) query.set('customerId', String(params.customerId));
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return requestBackend<PortalAccountRes[]>(`${API_BASE_URL}/portal-accounts${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

/** GET /portal-accounts/{accountId} — chi tiết một tài khoản cổng. */
export async function getPortalAccount(accountId: number): Promise<PortalAccountRes> {
  return requestBackend<PortalAccountRes>(`${API_BASE_URL}/portal-accounts/${accountId}`, { method: 'GET' });
}

/**
 * PATCH /portal-accounts/{accountId}/status — khoá (người liên hệ nghỉ việc) hoặc mở lại tài khoản cổng (TC-02).
 * Khoá làm mất hiệu lực mọi phiên đang mở, không xoá dữ liệu nào.
 */
export async function updatePortalAccountStatus(
  accountId: number,
  req: PortalAccountStatusReq
): Promise<PortalAccountRes> {
  return requestBackend<PortalAccountRes>(`${API_BASE_URL}/portal-accounts/${accountId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(req),
  });
}

/**
 * TC-03: người không phải Quản trị viên mở màn hình → gọi thật một endpoint của chức năng để backend trả 403 và
 * `AccessDeniedAuditRecorder` ghi "Từ chối truy cập — Cấp tài khoản cổng khách hàng". Kết quả không dùng tới.
 */
export async function checkPortalAccountAccess(): Promise<void> {
  await requestBackend<unknown>(`${API_BASE_URL}/portal-accounts`, { method: 'GET' });
}

/**
 * TC-04: lịch sử cấp/khoá/mở khoá tài khoản cổng từ Nhật ký hệ thống (`GET /audit-logs?targetType=PORTAL`).
 * Nhật ký PORTAL còn chứa các lượt khách hàng xem cổng và lượt bị từ chối — chỉ giữ thao tác quản trị trên tài khoản,
 * và lọc theo `accountId` khi xem lịch sử của một tài khoản.
 */
export async function fetchPortalAccountHistory(
  accountId?: number,
  size = 200,
  includeDenied = false
): Promise<AuditLogEntry[]> {
  const search = (action: string) => {
    // `action` lọc LIKE không phân biệt hoa thường.
    const query = new URLSearchParams({ targetType: 'PORTAL', action, page: '0', size: String(size) });
    return requestBackend<AuditLogPage>(`${API_BASE_URL}/audit-logs?${query.toString()}`, { method: 'GET' });
  };
  const actions: readonly string[] = PORTAL_ACCOUNT_AUDIT_ACTIONS;
  const [managed, denied] = await Promise.all([
    search('tài khoản cổng khách hàng'),
    includeDenied ? search(PORTAL_ACCESS_DENIED_ACTION) : Promise.resolve(null),
  ]);
  const entries = (managed.content ?? []).filter(
    (entry) => actions.includes(entry.action) && (accountId == null || entry.targetId === accountId)
  );
  // TC-03: lượt bị từ chối mở chức năng này (không gắn tài khoản cụ thể).
  const deniedEntries = (denied?.content ?? []).filter((entry) => entry.targetLabel === PORTAL_ACCOUNT_FEATURE_LABEL);
  // Nhiều thao tác trong cùng một giây trả về không theo thứ tự — sắp lại mới nhất trước.
  return [...entries, ...deniedEntries].sort(
    (a, b) => (b.performedAt ?? '').localeCompare(a.performedAt ?? '') || b.id - a.id
  );
}
