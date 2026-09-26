import type { BackupRecordRes, RestoreChallengeRes, RestoreResultRes } from '../types/adminTypes';
import { API_BASE_URL, requestBackend } from './adminHttp';

export { AdminApiError } from './adminHttp';

const BASE = `${API_BASE_URL}/backups`;

/**
 * Danh sách bản sao lưu, mới nhất trước (NCL-15-CN-003). Chỉ VT-07 — vai trò khác nhận `403` và
 * backend ghi "Từ chối truy cập" vào Nhật ký hệ thống (TC-03), nên màn hình luôn gọi API thật.
 * GET /backups
 */
export async function listBackups(): Promise<BackupRecordRes[]> {
  return requestBackend<BackupRecordRes[]>(BASE, { method: 'GET' });
}

export async function getBackup(backupId: number): Promise<BackupRecordRes> {
  return requestBackend<BackupRecordRes>(`${BASE}/${backupId}`, { method: 'GET' });
}

/**
 * Tạo bản sao lưu theo yêu cầu (TC-01). Lỗi giữa chừng VẪN trả 200 với `status: "FAILED"` — người gọi
 * phải kiểm tra `status`. `400 INVALID_STATE` khi đang có sao lưu/phục hồi khác chạy.
 * POST /backups
 */
export async function createBackup(note?: string | null): Promise<BackupRecordRes> {
  return requestBackend<BackupRecordRes>(BASE, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {}),
  });
}

/**
 * Phục hồi — bước 1/2 (QTN-30): kiểm tra bản sao (COMPLETED, tệp còn, SHA-256 khớp) và cấp mã xác
 * nhận hết hạn sau 5 phút. `400 INVALID_STATE` nếu bản sao không hợp lệ (TC-02).
 * POST /backups/{backupId}/restore-requests
 */
export async function requestRestore(backupId: number): Promise<RestoreChallengeRes> {
  return requestBackend<RestoreChallengeRes>(`${BASE}/${backupId}/restore-requests`, { method: 'POST' });
}

/**
 * Phục hồi — bước 2/2: gửi mã của bước 1 kèm mật khẩu đăng nhập nhập lại. `400 VALIDATION_ERROR` sai mã
 * hoặc mật khẩu (sai 3 lần thì yêu cầu bị hủy); `400 INVALID_STATE` hết hạn / đã kết thúc / đang bận;
 * `403` nếu không phải người tạo yêu cầu.
 * POST /backups/restore-requests/{requestId}/confirm
 */
export async function confirmRestore(requestId: number, confirmationToken: string, password: string): Promise<RestoreResultRes> {
  return requestBackend<RestoreResultRes>(`${BASE}/restore-requests/${requestId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ confirmationToken, password }),
  });
}
