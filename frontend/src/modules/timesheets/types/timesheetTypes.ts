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
