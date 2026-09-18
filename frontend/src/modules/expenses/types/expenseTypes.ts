/** Khớp enum ExpenseType phía backend (NCL-08-CN-001, Epic NCL-08). */
export type ExpenseType = 'TRAVEL' | 'TOOLS' | 'OTHER';

/** Khớp enum ExpenseStatus phía backend. */
export type ExpenseStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

/**
 * Một phiếu chi phí dự án trả về từ backend. Khớp `ExpenseRes` — dùng chung cho
 * NCL-08-CN-001 (ghi nhận), NCL-08-CN-002 (duyệt/từ chối) và NCL-08-CN-003 (đánh dấu
 * tính lại cho khách hàng). `approvedBy`/`rejectedBy` chỉ có giá trị khi phiếu đã được
 * xử lý tương ứng.
 */
export interface ExpenseRes {
  id: number;
  projectId: number;
  userId: number;
  type: ExpenseType;
  amount: number;
  expenseDate: string; // YYYY-MM-DD
  description: string;
  receiptUrl: string | null;
  billable: boolean;
  status: ExpenseStatus;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
}

/**
 * Payload từ chối phiếu chi phí (NCL-08-CN-002).
 * POST /expenses/{expenseId}/reject
 *
 * `reason` bắt buộc — thiếu nhận `400 VALIDATION_ERROR` trước khi backend chạm tới phiếu.
 */
export interface ExpenseRejectReq {
  reason: string;
}

/**
 * Payload đánh dấu/bỏ đánh dấu tính lại chi phí cho khách hàng (NCL-08-CN-003).
 * PUT /expenses/{expenseId}/billable
 */
export interface ExpenseBillableReq {
  billable: boolean;
}

/** Nhãn hiển thị cho từng loại chi phí (`ExpenseType`). */
export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  TRAVEL: 'Đi lại',
  TOOLS: 'Công cụ, dụng cụ',
  OTHER: 'Khác',
};

/** Nhãn hiển thị cho từng trạng thái phiếu chi phí (`ExpenseStatus`). */
export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  SUBMITTED: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

/** Class badge trạng thái tương ứng, dùng chung style `status-pill` của hệ thống. */
export const EXPENSE_STATUS_PILL_CLASS: Record<ExpenseStatus, string> = {
  SUBMITTED: 'status-pill--inactive',
  APPROVED: 'status-pill--active',
  REJECTED: 'status-pill--locked',
};

/**
 * Một phiếu chi phí thuê ngoài (nhà thầu phụ) của dự án. Khớp `SubcontractorExpenseRes`
 * (NCL-08-CN-004). Dùng chung `ExpenseStatus`/nhãn/badge với chi phí nội bộ — luồng
 * duyệt/từ chối của Kế toán (VT-05) nằm ngoài phạm vi màn hình ghi nhận này.
 */
export interface SubcontractorExpenseRes {
  id: number;
  projectId: number;
  userId: number;
  contractorName: string;
  workScope: string;
  amount: number;
  incurredPeriod: string; // YYYY-MM-DD
  status: ExpenseStatus;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
}

/**
 * Payload ghi nhận chi phí thuê ngoài (NCL-08-CN-004).
 * POST /projects/{projectId}/subcontractor-expenses
 */
export interface SubcontractorExpenseCreateReq {
  contractorName: string;
  workScope: string;
  amount: number;
  incurredPeriod: string; // YYYY-MM-DD
}
