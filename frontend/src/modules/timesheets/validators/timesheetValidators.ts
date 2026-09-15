import type { TimesheetSummary } from '../types/timesheetTypes';

/**
 * Điều kiện bật nút "Nộp bảng" (NCL-06-CN-002): backend tự kiểm mọi quy tắc
 * nghiệp vụ khi nộp — Frontend chỉ cần lặp lại đúng MỘT điều kiện hiển thị
 * theo tài liệu API: tuần phải có ít nhất một dòng giờ công ở trạng thái DRAFT.
 * Trạng thái khác (đã nộp/đã duyệt) thì ẩn nút để tránh gọi rồi mới nhận lỗi.
 */
export function canSubmitWeek(summaries: TimesheetSummary[]): boolean {
  return summaries.some((summary) => summary.entries.some((entry) => entry.status === 'DRAFT'));
}

/** Tổng số dòng DRAFT trong tuần — dùng để hiển thị số dòng sẽ chuyển sang chờ duyệt. */
export function countDraftEntries(summaries: TimesheetSummary[]): number {
  return summaries.reduce(
    (count, summary) => count + summary.entries.filter((entry) => entry.status === 'DRAFT').length,
    0
  );
}

/** true khi tuần chưa có bất kỳ dòng giờ công nào (chưa ghi giờ công cho công việc nào). */
export function isWeekEmpty(summaries: TimesheetSummary[]): boolean {
  return summaries.every((summary) => summary.entries.length === 0);
}
