import { describe, expect, it } from 'vitest';
import { AdminApiError } from '../api/adminHttp';
import {
  classifyConfirmError,
  describeRestoreRequestError,
  formatBytes,
  formatCountdown,
  notRestorableReason,
  secondsUntil,
} from '../utils/backupUtils';
import type { BackupRecordRes } from '../types/adminTypes';

const base: BackupRecordRes = { id: 1, code: 'BK-1', status: 'COMPLETED', triggerType: 'MANUAL', startedAt: '2026-01-01T00:00:00', restorable: true };

describe('backupUtils (NCL-15-CN-003)', () => {
  it('định dạng dung lượng', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(482113)).toBe('470,8 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(null)).toBe('—');
  });

  it('lý do không phục hồi được theo trạng thái (TC-02)', () => {
    expect(notRestorableReason(base)).toBeNull();
    expect(notRestorableReason({ ...base, status: 'IN_PROGRESS', restorable: false })).toMatch(/dở dang/);
    expect(notRestorableReason({ ...base, status: 'FAILED', restorable: false, errorMessage: 'Disk full' })).toMatch(/lỗi khi tạo: Disk full/);
  });

  it('chuyển lỗi bước 1 thành câu tiếng Việt', () => {
    const e = (m: string) => new AdminApiError('INVALID_STATE', m, 400);
    expect(describeRestoreRequestError(e('Ban sao luu BK-1 khong hop le (ban sao con dang tao do dang), khong the phuc hoi'), 'BK-1')).toMatch(/đang tạo dở dang/);
    expect(describeRestoreRequestError(e('... (khong tim thay tep sao luu) ...'), 'BK-1')).toMatch(/không tìm thấy tệp/);
    expect(describeRestoreRequestError(e('Dang phuc hoi du lieu, vui long thu lai sau'), 'BK-1')).toMatch(/thử lại sau/);
  });

  it('phân loại lỗi bước 2', () => {
    expect(classifyConfirmError(new AdminApiError('VALIDATION_ERROR', 'Ma xac nhan hoac mat khau khong dung', 400)).kind).toBe('WRONG_CREDENTIALS');
    expect(classifyConfirmError(new AdminApiError('VALIDATION_ERROR', 'Sai ... qua so lan cho phep, yeu cau phuc hoi da bi huy', 400)).kind).toBe('CANCELLED');
    expect(classifyConfirmError(new AdminApiError('INVALID_STATE', 'Ma xac nhan phuc hoi da het han, hay tao yeu cau phuc hoi moi', 400)).kind).toBe('EXPIRED');
    expect(classifyConfirmError(new AdminApiError('INVALID_STATE', 'Yeu cau phuc hoi #15 da ket thuc (COMPLETED)', 400)).kind).toBe('FINISHED');
    const failed = classifyConfirmError(new AdminApiError('INVALID_STATE', 'Phuc hoi that bai, du lieu hien tai duoc giu nguyen: ban sao khong khop cau truc', 400));
    expect(failed.kind).toBe('RESTORE_FAILED');
    expect(failed.message).toMatch(/dữ liệu hiện tại được giữ nguyên \(ban sao khong khop cau truc\)/);
    expect(classifyConfirmError(new AdminApiError('FORBIDDEN', 'x', 403)).kind).toBe('FORBIDDEN');
  });

  it('đếm ngược tới hạn mã xác nhận', () => {
    const now = new Date('2026-09-25T10:30:00').getTime();
    expect(secondsUntil('2026-09-25T10:35:00', now)).toBe(300);
    expect(secondsUntil('2026-09-25T10:00:00', now)).toBe(0);
    expect(formatCountdown(299)).toBe('4:59');
    expect(formatCountdown(5)).toBe('0:05');
  });
});
