import type { TimeEntryCreateReq, TimeEntryUpdateReq, TimesheetSummaryRes } from '../types/timesheetTypes';

export interface TimeEntryValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Ngày hôm nay theo múi giờ cục bộ của trình duyệt (không dùng `toISOString()` — hàm đó quy
 * đổi UTC nên có thể lệch một ngày so với "hôm nay" thực tế của người dùng ở múi giờ dương,
 * ví dụ UTC+7 vào những giờ đầu ngày).
 */
function todayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Kiểm tra hợp lệ dữ liệu ghi giờ công mới (NCL-06-CN-001).
 * Khớp ràng buộc backend `TimeEntryCreateReq`: ngày làm việc bắt buộc và không được ở
 * tương lai, số giờ công phải lớn hơn 0 (`@DecimalMin("0.01")`), ghi chú bắt buộc và tối
 * đa 1000 ký tự. Các quy tắc nghiệp vụ khác (trùng ngày, trần 12 giờ/ngày, dự án đã đóng)
 * do backend tự kiểm — Frontend không lặp lại, chỉ hiển thị lại thông báo lỗi trả về.
 */
export function validateTimeEntryCreateForm(
  payload: Partial<TimeEntryCreateReq>,
  today: string = todayIso()
): TimeEntryValidationResult {
  const errors: Record<string, string> = {};

  const workDate = payload.workDate?.trim() ?? '';
  if (!workDate) {
    errors.workDate = 'Ngày làm việc không được để trống';
  } else if (workDate > today) {
    errors.workDate = 'Ngày làm việc không được ở tương lai';
  }

  const hours = payload.hours;
  if (hours == null || Number.isNaN(hours)) {
    errors.hours = 'Số giờ công không được để trống';
  } else if (hours <= 0) {
    errors.hours = 'Số giờ công phải lớn hơn 0';
  }

  const note = payload.note?.trim() ?? '';
  if (!note) {
    errors.note = 'Ghi chú không được để trống';
  } else if (note.length > 1000) {
    errors.note = 'Ghi chú không được vượt 1000 ký tự';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * Điều kiện bật nút "Nộp bảng" (NCL-06-CN-002): backend tự kiểm mọi quy tắc nghiệp vụ khi
 * nộp — Frontend chỉ cần lặp lại đúng MỘT điều kiện hiển thị theo tài liệu API: tuần phải có
 * ít nhất một dòng giờ công ở trạng thái DRAFT. Trạng thái khác (đã nộp/đã duyệt) thì ẩn nút
 * để tránh gọi rồi mới nhận lỗi.
 */
export function canSubmitWeek(summaries: TimesheetSummaryRes[]): boolean {
  return summaries.some((summary) => summary.entries.some((entry) => entry.status === 'DRAFT'));
}

/** Tổng số dòng DRAFT trong tuần — dùng để hiển thị số dòng sẽ chuyển sang chờ duyệt. */
export function countDraftEntries(summaries: TimesheetSummaryRes[]): number {
  return summaries.reduce(
    (count, summary) => count + summary.entries.filter((entry) => entry.status === 'DRAFT').length,
    0
  );
}

/** true khi tuần chưa có bất kỳ dòng giờ công nào (chưa ghi giờ công cho công việc nào). */
export function isWeekEmpty(summaries: TimesheetSummaryRes[]): boolean {
  return summaries.every((summary) => summary.entries.length === 0);
}

/**
 * Kiểm tra lý do từ chối bảng chấm công (NCL-06-CN-004).
 * Khớp ràng buộc backend `TimesheetRejectReq`: bắt buộc, tối đa 1000 ký tự — thiếu nhận
 * `400 VALIDATION_ERROR` trước khi backend chạm tới bảng chấm công.
 */
export function validateRejectReason(reason: string): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) return 'Lý do từ chối không được để trống';
  if (trimmed.length > 1000) return 'Lý do từ chối không được vượt 1000 ký tự';
  return undefined;
}

/**
 * Kiểm tra hợp lệ dữ liệu sửa bản ghi giờ công (NCL-06-CN-001).
 * Khớp ràng buộc backend `TimeEntryUpdateReq`: số giờ công phải lớn hơn 0. Backend không
 * bắt buộc `note` khi sửa nhưng PUT luôn ghi đè ghi chú cũ (kể cả bằng rỗng/`null`) — FE
 * vẫn yêu cầu điền để tránh vô tình xoá trắng ghi chú đã có.
 */
export function validateTimeEntryUpdateForm(payload: Partial<TimeEntryUpdateReq>): TimeEntryValidationResult {
  const errors: Record<string, string> = {};

  const hours = payload.hours;
  if (hours == null || Number.isNaN(hours)) {
    errors.hours = 'Số giờ công không được để trống';
  } else if (hours <= 0) {
    errors.hours = 'Số giờ công phải lớn hơn 0';
  }

  const note = payload.note?.trim() ?? '';
  if (!note) {
    errors.note = 'Ghi chú không được để trống';
  } else if (note.length > 1000) {
    errors.note = 'Ghi chú không được vượt 1000 ký tự';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
