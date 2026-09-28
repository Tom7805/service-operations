import type { BackupRecordRes, BackupStatus } from '../types/adminTypes';
import { AdminApiError } from '../api/adminHttp';

/** Hiển thị cho màn Sao lưu và phục hồi dữ liệu (NCL-15-CN-003). */

export const MAX_BACKUP_NOTE = 500;

export const STATUS_META: Record<BackupStatus, { label: string; badge: string }> = {
  COMPLETED: { label: 'Hoàn tất', badge: 'badge--green' },
  IN_PROGRESS: { label: 'Đang tạo / dở dang', badge: 'badge--gold' },
  FAILED: { label: 'Lỗi', badge: 'badge--red' },
};

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString('vi-VN', { maximumFractionDigits: v < 10 ? 2 : 1 })} ${units[i]}`;
}

export function formatCount(n: number | null | undefined): string {
  return n == null ? '—' : n.toLocaleString('vi-VN');
}

/** Lý do một bản sao không phục hồi được — hiện ngay trên nút bị khóa (TC-02). */
export function notRestorableReason(b: BackupRecordRes): string | null {
  if (b.restorable) return null;
  if (b.status === 'IN_PROGRESS') return 'Bản sao còn đang tạo hoặc bị dở dang — không phục hồi được.';
  if (b.status === 'FAILED') return `Bản sao bị lỗi khi tạo${b.errorMessage ? `: ${b.errorMessage}` : ''} — không phục hồi được.`;
  return 'Bản sao không hợp lệ để phục hồi.';
}

/**
 * Bước 1 bị chặn (400 INVALID_STATE, TC-02): chuyển message của máy chủ ("Ban sao luu BK-… khong hop le (…)")
 * thành câu tiếng Việt có dấu cho người dùng.
 */
export function describeRestoreRequestError(err: unknown, code: string): string {
  if (!(err instanceof AdminApiError)) return err instanceof Error ? err.message : 'Không thể tạo yêu cầu phục hồi.';
  const m = err.message.toLowerCase();
  if (err.code === 'INVALID_STATE') {
    if (m.includes('dang sao luu') || m.includes('dang phuc hoi') || m.includes('vui long thu lai')) {
      return 'Đang có một thao tác sao lưu hoặc phục hồi khác chạy. Vui lòng thử lại sau ít phút.';
    }
    let reason = 'bản sao không đạt điều kiện phục hồi';
    if (m.includes('do dang') || m.includes('dang tao')) reason = 'bản sao còn đang tạo dở dang';
    else if (m.includes('bi loi')) reason = 'bản sao bị lỗi khi tạo';
    else if (m.includes('khong tim thay tep')) reason = 'không tìm thấy tệp sao lưu trên máy chủ';
    else if (m.includes('checksum') || m.includes('hong') || m.includes('thay doi')) reason = 'tệp sao lưu đã bị thay đổi hoặc hỏng (sai mã kiểm tra SHA-256)';
    return `Bản sao lưu ${code} không hợp lệ (${reason}), không thể phục hồi.`;
  }
  if (err.statusCode === 404) return `Không tìm thấy bản sao lưu ${code}. Danh sách đã được tải lại.`;
  return err.message;
}

export type ConfirmErrorKind =
  | 'WRONG_CREDENTIALS'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FINISHED'
  | 'BUSY'
  | 'RESTORE_FAILED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'OTHER';

/** Phân loại lỗi bước 2 để hộp thoại biết còn cho nhập lại hay phải làm lại bước 1. */
export function classifyConfirmError(err: unknown): { kind: ConfirmErrorKind; message: string } {
  if (!(err instanceof AdminApiError)) {
    return { kind: 'OTHER', message: err instanceof Error ? err.message : 'Không thể phục hồi dữ liệu.' };
  }
  const m = err.message.toLowerCase();
  if (err.statusCode === 403) {
    return { kind: 'FORBIDDEN', message: 'Chỉ quản trị viên đã tạo yêu cầu phục hồi này mới được xác nhận.' };
  }
  if (err.statusCode === 404) return { kind: 'NOT_FOUND', message: 'Yêu cầu phục hồi không còn tồn tại. Hãy tạo yêu cầu mới.' };
  if (err.code === 'VALIDATION_ERROR') {
    if (m.includes('da bi huy') || m.includes('qua so lan')) {
      return { kind: 'CANCELLED', message: 'Sai mật khẩu quá số lần cho phép — yêu cầu phục hồi đã bị hủy. Hãy tạo yêu cầu mới.' };
    }
    return { kind: 'WRONG_CREDENTIALS', message: 'Mật khẩu hoặc mã xác nhận không đúng.' };
  }
  if (err.code === 'INVALID_STATE') {
    if (m.includes('phuc hoi that bai')) {
      // Giao dịch đã rollback — dữ liệu hiện tại còn nguyên (VD bản sao không khớp cấu trúc CSDL hiện tại).
      const reason = err.message.split(':').slice(1).join(':').trim();
      return {
        kind: 'RESTORE_FAILED',
        message: `Phục hồi thất bại, dữ liệu hiện tại được giữ nguyên${reason ? ` (${reason})` : ''}.`,
      };
    }
    if (m.includes('het han')) return { kind: 'EXPIRED', message: 'Mã xác nhận đã hết hạn. Hãy tạo yêu cầu phục hồi mới.' };
    if (m.includes('da ket thuc')) return { kind: 'FINISHED', message: 'Yêu cầu phục hồi này đã kết thúc. Hãy tạo yêu cầu mới.' };
    if (m.includes('dang sao luu') || m.includes('dang phuc hoi') || m.includes('thu lai')) {
      return { kind: 'BUSY', message: 'Đang có một thao tác sao lưu hoặc phục hồi khác chạy. Vui lòng thử lại sau ít phút.' };
    }
    return { kind: 'FINISHED', message: `Không thể phục hồi: ${err.message}` };
  }
  return { kind: 'OTHER', message: err.message };
}

/** Số giây còn lại tới `expiresAt` (giờ máy chủ, không múi giờ — coi như giờ địa phương). */
export function secondsUntil(expiresAt: string, now = Date.now()): number {
  const t = new Date(expiresAt).getTime();
  return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((t - now) / 1000));
}

export function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
