/** Khớp enum TimeEntryStatus phía backend (NCL-06-CN-001, Epic NCL-06). */
export type TimeEntryStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

/**
 * Một bản ghi giờ công trả về từ backend (NCL-06-CN-001).
 * Khớp TimeEntryRes — mọi bản ghi mới tạo ở story này luôn có `status = 'DRAFT'`.
 */
export interface TimeEntryRes {
  id: number;
  taskId: number;
  userId: number;
  workDate: string; // YYYY-MM-DD
  hours: number;
  status: TimeEntryStatus;
  note: string | null;
  billable: boolean;
  createdAt: string;
}

/**
 * Payload ghi giờ công mới cho một công việc (NCL-06-CN-001).
 * POST /projects/{projectId}/tasks/{taskId}/time-entries
 */
export interface TimeEntryCreateReq {
  workDate: string; // YYYY-MM-DD, không được ở tương lai
  hours: number; // > 0
  note: string; // bắt buộc, tối đa 1000 ký tự
  billable?: boolean; // mặc định true nếu không truyền
}

/**
 * Payload sửa bản ghi giờ công DRAFT của chính mình (NCL-06-CN-001).
 * PUT /projects/{projectId}/tasks/{taskId}/time-entries/{entryId}
 *
 * `workDate` và công việc không đổi được qua API này — muốn đổi ngày thì xoá bản ghi
 * cũ rồi ghi bản ghi mới.
 */
export interface TimeEntryUpdateReq {
  hours: number; // > 0, ghi đè số giờ cũ
  note?: string | null; // ghi đè ghi chú cũ
  billable?: boolean; // không truyền thì giữ nguyên giá trị cũ
}

/**
 * Một công việc đang được giao cho chính mình trong dự án đang RUNNING (NCL-06-CN-001).
 * Khớp TimeEntryTaskRes — nguồn dữ liệu cho danh sách chọn dự án/công việc khi ghi giờ.
 * Lọc chỉ hỗ trợ giao diện: các API tạo/sửa/xoá bên dưới vẫn tự kiểm lại trạng thái dự án.
 */
export interface TimeEntryTaskRes {
  projectId: number;
  projectName: string;
  taskId: number;
  taskName: string;
  taskStatus: string;
}

/**
 * Tổng hợp giờ công một công việc trong một khoảng ngày (tuần chấm công), nhóm theo
 * công việc (NCL-06-CN-001). Khớp TimesheetSummaryRes trả về từ `GET /me/time-entries`.
 */
export interface TimesheetSummaryRes {
  taskId: number;
  taskName: string | null;
  weekFrom: string; // YYYY-MM-DD
  weekTo: string; // YYYY-MM-DD
  entries: TimeEntryRes[];
  totalHours: number;
  /** Ngân sách giờ công của công việc — null nếu chưa đặt. */
  budgetHours: number | null;
  /** Giờ công đã duyệt — hiện luôn 0 vì luồng duyệt (VHDV-84) chưa triển khai. */
  approvedHours: number | null;
  /** Tổng giờ đã ghi / ngân sách — null khi chưa đặt ngân sách. */
  usageRatio: number | null;
  /** Cảnh báo khi usageRatio >= 0.80 (QTN-20). */
  overBudgetWarning: boolean;
}

/** Trạng thái bảng chấm công tuần — chỉ tồn tại sau khi đã nộp lần đầu (NCL-06-CN-002). */
export type TimesheetStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

/**
 * Kết quả trả về sau khi nộp bảng chấm công tuần (NCL-06-CN-002).
 * Khớp TimesheetRes — POST /me/timesheets/{weekStartDate}/submit.
 */
export interface TimesheetRes {
  id: number;
  userId: number;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  status: TimesheetStatus;
  totalHours: number;
  submittedBy: string | null;
  submittedAt: string | null;
}

/**
 * Một bảng chấm công trong hàng chờ duyệt của PM hiện tại (NCL-06-CN-003).
 * Khớp PendingTimesheetRes — chỉ các bảng có ít nhất một dòng SUBMITTED thuộc dự án PM
 * quản lý; `pendingEntries`/`pendingHours` là phần con thuộc dự án của PM này (bảng có thể
 * còn phần khác thuộc PM khác).
 */
export interface PendingTimesheetRes {
  timesheetId: number;
  userId: number;
  userName: string | null;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  /** Tổng giờ công của cả tuần (mọi dự án), không chỉ phần của PM này. */
  totalHours: number;
  pendingEntries: number;
  pendingHours: number;
  submittedAt: string;
}

/**
 * Payload duyệt bảng chấm công (NCL-06-CN-003).
 * POST /timesheets/{timesheetId}/approve
 *
 * Bỏ qua/để trống `entryIds` = duyệt nguyên bảng (mọi dòng SUBMITTED thuộc dự án PM quản
 * lý); truyền id = chỉ duyệt từng dòng đó.
 */
export interface TimesheetApproveReq {
  entryIds?: number[];
  note?: string;
}

/** Kết quả duyệt bảng chấm công (NCL-06-CN-003). Khớp TimesheetApprovalRes. */
export interface TimesheetApprovalRes {
  timesheet: TimesheetRes;
  /** Cảnh báo từng công việc đã đạt/vượt 80% ngân sách (QTN-20) — duyệt vẫn thành công. */
  overBudgetWarnings: string[];
}

/**
 * Payload từ chối bảng chấm công (NCL-06-CN-004).
 * POST /timesheets/{timesheetId}/reject
 *
 * `reason` bắt buộc. Bỏ qua/để trống `entryIds` = từ chối nguyên bảng; truyền id = chỉ từ
 * chối từng dòng đó — dòng bị từ chối quay về DRAFT để nhân viên sửa và nộp lại.
 */
export interface TimesheetRejectReq {
  entryIds?: number[];
  reason: string;
}

/** Kết quả từ chối bảng chấm công (NCL-06-CN-004). Khớp TimesheetRejectRes. */
export interface TimesheetRejectRes {
  timesheet: TimesheetRes;
  rejectedEntries: number;
}

/**
 * Payload điều chỉnh một dòng giờ công đã duyệt bằng bút toán đảo (NCL-06-CN-005).
 * POST /projects/{projectId}/tasks/{taskId}/time-entries/{entryId}/reversal
 *
 * Backend tự sinh dòng đảo (`-hours` của dòng gốc) — chỉ cần cung cấp số giờ đúng và lý do.
 */
export interface TimeEntryAdjustmentReq {
  correctedHours: number;
  reason: string;
}

/**
 * Dấu vết đầy đủ một lần điều chỉnh (NCL-06-CN-005). Khớp AdjustmentTraceRes — cả ba dòng
 * (gốc/đảo/sửa) đều tra cứu lại được; dòng gốc giữ nguyên không đổi (QTN-11).
 */
export interface AdjustmentTraceRes {
  adjustmentId: number;
  originalEntry: TimeEntryRes | null;
  reversalEntry: TimeEntryRes | null;
  correctedEntry: TimeEntryRes | null;
  reason: string;
  adjustedBy: string | null;
  adjustedAt: string;
}

/**
 * Một dòng giờ công ĐÃ DUYỆT, còn là dòng gốc và chưa từng điều chỉnh — đủ điều kiện để
 * PM chọn tạo bút toán đảo (NCL-06-CN-005). Khớp AdjustableEntryRes —
 * `GET /timesheets/adjustable-entries`. Nguồn dữ liệu cho PM chọn trực tiếp trên màn hình
 * thay vì phải tự biết trước Project ID/Task ID/Entry ID.
 */
export interface AdjustableEntryRes {
  entryId: number;
  projectId: number;
  projectName: string;
  taskId: number;
  taskName: string;
  userId: number;
  workDate: string; // YYYY-MM-DD
  hours: number;
  note: string | null;
}

/** Trạng thái kỳ chấm công theo tháng (NCL-06-CN-006). */
export type PeriodStatus = 'OPEN' | 'LOCKED';

/**
 * Kỳ chấm công theo tháng (NCL-06-CN-006). Khớp TimesheetPeriodRes — khóa/mở đồng loạt cả
 * tháng, không khóa theo tuần lẻ.
 */
export interface TimesheetPeriodRes {
  id: number;
  periodStart: string; // YYYY-MM-DD, ngày 1 của tháng
  periodEnd: string; // YYYY-MM-DD, ngày cuối tháng
  status: PeriodStatus;
  lockedBy: string | null;
  lockedAt: string | null;
}

/**
 * Payload khóa kỳ chấm công theo tháng (NCL-06-CN-006).
 * POST /timesheet-periods/lock
 *
 * Chọn kỳ theo tháng (`year`/`month`) chứ không nhập trực tiếp ngày đầu/cuối — backend tự
 * suy ra khoảng ngày của cả tháng. Nếu kỳ cho tháng đó chưa tồn tại thì tạo mới rồi khóa luôn.
 */
export interface PeriodLockReq {
  year: number;
  month: number; // 1-12
}

/**
 * Payload bắt đầu đồng hồ bấm giờ cho một công việc (NCL-06-CN-008).
 * POST /projects/{projectId}/tasks/{taskId}/time-entry-timer
 *
 * `note` bắt buộc (khớp bản ghi giờ công sẽ tạo khi dừng); `billable` mặc định `true` nếu
 * không truyền.
 */
export interface TimerStartReq {
  note: string;
  billable?: boolean;
}

/**
 * Trạng thái phiên đồng hồ bấm giờ đang chạy của chính mình (NCL-06-CN-008). Khớp TimerRes —
 * mỗi nhân sự chỉ có tối đa một phiên đang chạy tại một thời điểm.
 */
export interface TimerRes {
  timerId: number;
  projectId: number;
  taskId: number;
  userId: number;
  startedAt: string;
  /** Số giờ đã trôi qua tại thời điểm gọi API — chỉ để tham khảo, FE tự đếm tiếp theo đồng hồ máy. */
  elapsedHours: number;
  note: string;
  billable: boolean;
}

/**
 * Một nhân sự còn chưa nộp bảng chấm công của tuần được tra cứu (NCL-06-CN-009). Khớp
 * UnsubmittedTimesheetRes — `GET /timesheets/unsubmitted?weekStartDate=...`. PM xem được
 * nhân sự của các dự án mình quản lý; nhân viên chuyên môn tự tra cứu chính mình.
 */
export interface UnsubmittedTimesheetRes {
  userId: number;
  userName: string | null;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
}
