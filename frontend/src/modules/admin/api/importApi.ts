import type { ImportCommitReq, ImportPreviewRes, ImportResultRes, ImportTargetType } from '../types/adminTypes';
import { AdminApiError, API_BASE_URL, requestBackend } from './adminHttp';

export { AdminApiError } from './adminHttp';

const BASE = `${API_BASE_URL}/imports`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Tải tệp mẫu CSV (có BOM để Excel hiện đúng tiếng Việt). GET /imports/templates/{targetType} */
export async function downloadImportTemplate(targetType: ImportTargetType): Promise<{ blob: Blob; fileName: string }> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/templates/${targetType}`, { headers: authHeader() });
  } catch {
    throw new AdminApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new AdminApiError(
      payload.errorCode || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR'),
      response.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : payload.message || 'Không tải được tệp mẫu.',
      response.status
    );
  }
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `mau-nhap-${targetType.toLowerCase()}.csv`;
  return { blob: await response.blob(), fileName };
}

/**
 * Bước 1 — kiểm tra tệp, chưa ghi dữ liệu nào. Multipart gồm `targetType` và `file`.
 * `400 VALIDATION_ERROR` khi tệp rỗng, không phải CSV, vượt 2 MB / 2000 dòng hoặc sai mẫu.
 */
export async function previewImport(targetType: ImportTargetType, file: File): Promise<ImportPreviewRes> {
  const form = new FormData();
  form.append('targetType', targetType);
  form.append('file', file);
  let response: Response;
  try {
    response = await fetch(`${BASE}/preview`, { method: 'POST', headers: authHeader(), body: form });
  } catch {
    throw new AdminApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Không kiểm tra được tệp.';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (response.status === 403) message = 'Bạn không có quyền thực hiện thao tác này.';
    throw new AdminApiError(code, message, response.status, payload.fieldErrors ?? []);
  }
  return payload.data as ImportPreviewRes;
}

/** Bước 2 — nhập các dòng hợp lệ và xử lý dòng trùng theo lựa chọn. POST /imports/{jobId}/commit */
export async function commitImport(jobId: number, request: ImportCommitReq): Promise<ImportResultRes> {
  return requestBackend<ImportResultRes>(`${BASE}/${jobId}/commit`, { method: 'POST', body: JSON.stringify(request) });
}

export async function listImports(): Promise<ImportResultRes[]> {
  return requestBackend<ImportResultRes[]>(BASE, { method: 'GET' });
}

export async function getImport(jobId: number): Promise<ImportResultRes> {
  return requestBackend<ImportResultRes>(`${BASE}/${jobId}`, { method: 'GET' });
}
