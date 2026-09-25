import type {
  AcceptanceCertificateRes,
  AcceptanceConfirmReq,
  AcceptanceCreateReq,
  AcceptanceDetailRes,
  AcceptanceMilestoneLinkReq,
  AcceptanceReadinessRes,
  AcceptanceRejectReq,
  AcceptanceStatus,
  AcceptanceUpdateReq,
  DeliverableCreateReq,
  DeliverableRes,
  DeliverableVersionReq,
  DeliverableVersionRes,
  MilestoneAcceptanceRes,
} from '../types/acceptanceTypes';
import { httpFetch } from '../../../utils/http';

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
    response = await httpFetch(url, { ...options, headers });
  } catch {
    throw new AcceptanceApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 403) {
      message =
        'Bạn không có quyền thực hiện thao tác này — phiếu nghiệm thu và sản phẩm bàn giao do Quản lý dự án phụ trách ' +
        'dự án quản lý, việc gắn phiếu với mốc thanh toán do Kế toán thực hiện.';
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

/** GET /acceptances?contractId=&projectId=&status= — Kế toán thấy mọi phiếu, lọc theo hợp đồng để chọn phiếu gắn mốc. */
export async function searchAcceptances(
  params: { contractId?: number; projectId?: number; status?: AcceptanceStatus } = {}
): Promise<AcceptanceCertificateRes[]> {
  const qs = new URLSearchParams();
  if (params.contractId != null) qs.set('contractId', String(params.contractId));
  if (params.projectId != null) qs.set('projectId', String(params.projectId));
  if (params.status) qs.set('status', params.status);
  const query = qs.toString();
  return requestBackend<AcceptanceCertificateRes[]>(`${API_BASE_URL}/acceptances${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

/** GET /contracts/{contractId}/milestone-acceptances — mốc thanh toán kèm phiếu đã gắn. Chỉ Kế toán (VT-05). */
export async function fetchMilestoneAcceptances(contractId: number): Promise<MilestoneAcceptanceRes[]> {
  return requestBackend<MilestoneAcceptanceRes[]>(`${API_BASE_URL}/contracts/${contractId}/milestone-acceptances`, {
    method: 'GET',
  });
}

/** PUT /acceptances/{certificateId}/payment-milestone — gắn (hoặc đổi) mốc; trạng thái mốc đồng bộ theo phiếu (QTN-25). */
export async function linkPaymentMilestone(
  certificateId: number,
  req: AcceptanceMilestoneLinkReq
): Promise<AcceptanceDetailRes> {
  return requestBackend<AcceptanceDetailRes>(`${API_BASE_URL}/acceptances/${certificateId}/payment-milestone`, {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

/** DELETE /acceptances/{certificateId}/payment-milestone — gỡ phiếu khỏi mốc; mốc đang mở thì về chờ nghiệm thu. */
export async function unlinkPaymentMilestone(certificateId: number): Promise<AcceptanceDetailRes> {
  return requestBackend<AcceptanceDetailRes>(`${API_BASE_URL}/acceptances/${certificateId}/payment-milestone`, {
    method: 'DELETE',
  });
}

/* ===== NCL-12-CN-004 — Sản phẩm bàn giao và phiên bản (Quản lý dự án của dự án, VT-02) ===== */

/** GET /projects/{projectId}/deliverables?workPackageId= — sản phẩm bàn giao kèm toàn bộ lịch sử phiên bản. */
export async function fetchDeliverables(projectId: number, workPackageId?: number): Promise<DeliverableRes[]> {
  const qs = workPackageId != null ? `?workPackageId=${workPackageId}` : '';
  return requestBackend<DeliverableRes[]>(`${API_BASE_URL}/projects/${projectId}/deliverables${qs}`, { method: 'GET' });
}

/** GET /deliverables/{deliverableId} — chi tiết một sản phẩm và lịch sử phiên bản. */
export async function getDeliverable(deliverableId: number): Promise<DeliverableRes> {
  return requestBackend<DeliverableRes>(`${API_BASE_URL}/deliverables/${deliverableId}`, { method: 'GET' });
}

/** POST /projects/{projectId}/deliverables — khai báo sản phẩm bàn giao cho một hạng mục. */
export async function createDeliverable(projectId: number, req: DeliverableCreateReq): Promise<DeliverableRes> {
  return requestBackend<DeliverableRes>(`${API_BASE_URL}/projects/${projectId}/deliverables`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** POST /deliverables/{deliverableId}/versions — bàn giao một phiên bản mới (TC-01); trùng số phiên bản → 409 (TC-02). */
export async function createDeliverableVersion(
  deliverableId: number,
  req: DeliverableVersionReq
): Promise<DeliverableVersionRes> {
  return requestBackend<DeliverableVersionRes>(`${API_BASE_URL}/deliverables/${deliverableId}/versions`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/**
 * NCL-12-CN-004 TC-03: người không phải Quản lý dự án mở chức năng quản lý sản phẩm bàn giao → request thật tới
 * endpoint chỉ dành cho VT-02 để backend trả 403 và ghi "Từ chối truy cập — Quản lý sản phẩm bàn giao".
 */
export async function checkDeliverableAccess(): Promise<void> {
  await requestBackend<unknown>(`${API_BASE_URL}/projects/0/deliverables`, { method: 'GET' });
}

/**
 * NCL-12-CN-003 TC-03: người không phải Kế toán mở chức năng gắn nghiệm thu với mốc thanh toán → gọi thật
 * endpoint chỉ dành cho VT-05 để backend trả 403 và ghi "Từ chối truy cập — Gắn phiếu nghiệm thu với mốc
 * thanh toán" vào Nhật ký hệ thống. Endpoint chỉ đọc nên không đổi dữ liệu.
 */
export async function checkMilestoneLinkAccess(contractId: number): Promise<void> {
  await requestBackend<unknown>(`${API_BASE_URL}/contracts/${contractId}/milestone-acceptances`, { method: 'GET' });
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
