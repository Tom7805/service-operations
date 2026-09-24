import type {
  AcceptanceCertificateRes,
  AcceptanceConfirmReq,
  AcceptanceCreateReq,
  AcceptanceDetailRes,
  AcceptanceReadinessRes,
  AcceptanceRejectReq,
  AcceptanceUpdateReq,
} from '../types/acceptanceTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class AcceptanceApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'AcceptanceApiError';
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
    throw new AcceptanceApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 403) {
      message = 'Bạn không có quyền thao tác trên dự án này — chỉ Quản lý dự án phụ trách mới lập được phiếu nghiệm thu.';
    }
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      message = payload.fieldErrors.map((f: { message: string }) => f.message).join('; ');
    }
    throw new AcceptanceApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/**
 * GET /projects/{projectId}/work-packages/{workPackageId}/acceptance-readiness — xem trước hạng mục
 * đã đủ điều kiện lập phiếu chưa (QTN-24), kèm danh sách công việc còn dang dở (TC-02). Chỉ PM dự án.
 */
export async function getAcceptanceReadiness(
  projectId: number,
  workPackageId: number
): Promise<AcceptanceReadinessRes> {
  return requestBackend<AcceptanceReadinessRes>(
    `${API_BASE_URL}/projects/${projectId}/work-packages/${workPackageId}/acceptance-readiness`,
    { method: 'GET' }
  );
}

/** POST /projects/{projectId}/acceptances — lập phiếu nghiệm thu (TC-01). Phiếu sinh ra ở trạng thái chờ xác nhận. */
export async function createAcceptance(projectId: number, req: AcceptanceCreateReq): Promise<AcceptanceDetailRes> {
  return requestBackend<AcceptanceDetailRes>(`${API_BASE_URL}/projects/${projectId}/acceptances`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** GET /projects/{projectId}/acceptances — phiếu của một dự án, mới nhất trước. Chỉ PM dự án. */
export async function fetchProjectAcceptances(projectId: number): Promise<AcceptanceCertificateRes[]> {
  return requestBackend<AcceptanceCertificateRes[]>(`${API_BASE_URL}/projects/${projectId}/acceptances`, {
    method: 'GET',
  });
}

/** GET /acceptances/{certificateId} — chi tiết phiếu (PM dự án hoặc Kế toán). */
export async function getAcceptance(certificateId: number): Promise<AcceptanceDetailRes> {
  return requestBackend<AcceptanceDetailRes>(`${API_BASE_URL}/acceptances/${certificateId}`, { method: 'GET' });
}

/** POST /acceptances/{certificateId}/confirm — phiếu → ACCEPTED, khoá nội dung, mở mốc thanh toán đã gắn (QTN-25). */
export async function confirmAcceptance(certificateId: number, req: AcceptanceConfirmReq): Promise<AcceptanceDetailRes> {
  return requestBackend<AcceptanceDetailRes>(`${API_BASE_URL}/acceptances/${certificateId}/confirm`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** POST /acceptances/{certificateId}/reject — phiếu → NEEDS_REVISION, lưu lý do từ chối. */
export async function rejectAcceptance(certificateId: number, req: AcceptanceRejectReq): Promise<AcceptanceDetailRes> {
  return requestBackend<AcceptanceDetailRes>(`${API_BASE_URL}/acceptances/${certificateId}/reject`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** PUT /acceptances/{certificateId} — nộp lại phiếu bị từ chối: chụp lại nội dung, tăng lần nộp, về chờ xác nhận. */
export async function resubmitAcceptance(certificateId: number, req: AcceptanceUpdateReq): Promise<AcceptanceDetailRes> {
  return requestBackend<AcceptanceDetailRes>(`${API_BASE_URL}/acceptances/${certificateId}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

/**
 * NCL-12-CN-002 TC-03: request thật tới endpoint xác nhận phiếu khi người không đủ vai trò mở chức năng,
 * để backend trả 403 và ghi "Từ chối truy cập — Xác nhận phiếu nghiệm thu". Body phải HỢP LỆ: Spring
 * kiểm tra @Valid trước khi tới @PreAuthorize, body rỗng sẽ nhận 400 và không có gì được ghi nhật ký.
 * Phiếu id 0 không tồn tại nên dù lỡ gọi với QLDA cũng chỉ nhận 404, không thay đổi dữ liệu.
 */
export async function checkAcceptanceConfirmAccess(): Promise<void> {
  await requestBackend<unknown>(`${API_BASE_URL}/acceptances/0/confirm`, {
    method: 'POST',
    body: JSON.stringify({ signerName: '-', signedDate: '2000-01-01', minutesUrl: '-' }),
  });
}

/**
 * TC-03: gửi một request thật tới endpoint chỉ dành cho Quản lý dự án khi người không đủ vai trò mở
 * chức năng lập phiếu — để backend trả 403 và AccessDeniedAuditRecorder ghi "Từ chối truy cập — Lập
 * phiếu nghiệm thu hạng mục" vào Nhật ký hệ thống (chặn thuần ở giao diện thì không có gì được ghi).
 */
export async function checkAcceptanceAccess(): Promise<void> {
  await requestBackend<unknown>(`${API_BASE_URL}/projects/0/acceptances`, { method: 'GET' });
}
