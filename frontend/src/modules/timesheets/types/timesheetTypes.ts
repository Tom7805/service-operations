/**
 * Kiểu dữ liệu chấm công tuần (NCL-06-CN-001/CN-002) — khớp DTO backend
 * `TimeEntryRes` / `TimesheetSummaryRes` / `TimesheetRes` (module
 * `com.serviceops.modules.timesheet`).
 */

/** Trạng thái một dòng giờ công. Bản ghi mới luôn là DRAFT. */
export type TimeEntryStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

/** Trạng thái bảng chấm công tuần (chỉ tồn tại sau khi đã nộp lần đầu). */
export type TimesheetStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface TimeEntry {
  id: number;
  taskId: number;
  userId: number;
  /** Ngày làm việc, dạng ISO `yyyy-MM-dd`. */
  workDate: string;
  hours: number;
  status: TimeEntryStatus;
  note: string | null;
  createdAt: string;
}

/** Giờ công của một công việc trong tuần, kèm cảnh báo ngân sách (QTN-20). */
export interface TimesheetSummary {
  taskId: number;
  taskName: string;
  weekFrom: string;
  weekTo: string;
  entries: TimeEntry[];
  totalHours: number;
  budgetHours: number | null;
  approvedHours: number | null;
  /** Phân số 0.0–1.0+; null khi công việc chưa đặt ngân sách. */
  usageRatio: number | null;
  overBudgetWarning: boolean;
}

/** Kết quả trả về sau khi nộp bảng chấm công tuần. */
export interface TimesheetRes {
  id: number;
  userId: number;
  weekStartDate: string;
  weekEndDate: string;
  status: TimesheetStatus;
  totalHours: number;
  submittedBy: string | null;
  submittedAt: string | null;
}

export interface ApiFieldError {
  field: string;
  message: string;
}
