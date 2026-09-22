/** Khớp enum InvoiceProposalStatus phía backend — đề nghị mới tạo luôn ở `PENDING`. */
export type InvoiceProposalStatus = 'PENDING' | 'INVOICED' | 'CANCELLED';

/** Khớp enum InvoiceProposalLineType phía backend — dòng giờ công hoặc dòng phiếu chi phí. */
export type InvoiceProposalLineType = 'LABOR' | 'EXPENSE';

/**
 * Payload tạo đề nghị xuất hóa đơn từ giờ công đã duyệt (NCL-10-CN-001).
 * POST /projects/{projectId}/invoice-proposals
 */
export interface InvoiceProposalCreateReq {
  periodFrom: string; // YYYY-MM-DD
  periodTo: string; // YYYY-MM-DD
  note?: string | null;
}

/**
 * Một dòng trong đề nghị xuất hóa đơn — dòng giờ công (`LABOR`) hoặc dòng phiếu chi phí
 * tính lại cho khách hàng (`EXPENSE`). Khớp `InvoiceProposalLineRes`.
 */
export interface InvoiceProposalLineRes {
  id: number;
  lineType: InvoiceProposalLineType;
  timeEntryId: number | null;
  projectExpenseId: number | null;
  lineDate: string; // YYYY-MM-DD
  userId: number | null;
  hours: number | null;
  unitRate: number | null;
  description: string;
  amount: number;
}

/** Số dòng giờ công bị bỏ qua khi gom, theo từng lý do — khớp `data.skipped`. */
export interface InvoiceProposalSkippedRes {
  notApprovedCount: number;
  nonBillableCount: number;
  alreadyProposedCount: number;
  missingRateCount: number;
}

/**
 * Đề nghị xuất hóa đơn trả về từ backend (NCL-10-CN-001). Khớp `InvoiceProposalRes`.
 * `laborLines`/`expenseLines` sắp theo ngày tăng dần; `totalAmount` = `laborAmount +
 * expenseAmount`, có thể `<= 0` khi kỳ chỉ còn dòng đảo (QTN-11) — không phải lỗi.
 */
export interface InvoiceProposalRes {
  id: number;
  proposalCode: string;
  projectId: number;
  contractId: number;
  customerId: number;
  periodFrom: string; // YYYY-MM-DD
  periodTo: string; // YYYY-MM-DD
  status: InvoiceProposalStatus;
  laborAmount: number;
  expenseAmount: number;
  totalAmount: number;
  note: string | null;
  laborLines: InvoiceProposalLineRes[];
  expenseLines: InvoiceProposalLineRes[];
  skipped: InvoiceProposalSkippedRes;
  createdBy: string;
  createdAt: string;
}

/** Nhãn hiển thị cho trạng thái đề nghị xuất hóa đơn. */
export const INVOICE_PROPOSAL_STATUS_LABELS: Record<InvoiceProposalStatus, string> = {
  PENDING: 'Chờ lập hóa đơn',
  INVOICED: 'Đã lập hóa đơn',
  CANCELLED: 'Đã hủy',
};

/** Class badge trạng thái tương ứng, dùng chung style `status-pill` của hệ thống. */
export const INVOICE_PROPOSAL_STATUS_PILL_CLASS: Record<InvoiceProposalStatus, string> = {
  PENDING: 'status-pill--inactive',
  INVOICED: 'status-pill--active',
  CANCELLED: 'status-pill--locked',
};

/** Tổng số dòng bị bỏ qua khi gom đề nghị — dùng để quyết định có hiện cảnh báo hay không. */
export function totalSkipped(skipped: InvoiceProposalSkippedRes): number {
  return skipped.notApprovedCount + skipped.nonBillableCount + skipped.alreadyProposedCount + skipped.missingRateCount;
}
