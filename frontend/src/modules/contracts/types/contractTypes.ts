export type ContractType = 'TIME_AND_MATERIAL' | 'FIXED_PRICE' | 'MAINTENANCE' | 'MILESTONE';

export interface ContractCreateFromOpportunityReq {
  name?: string | null;
  contractType: ContractType;
  totalValue?: number | null;
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  notes?: string | null;
}

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED';

/** Khớp đúng field name của backend (OpportunityRes) — trước đây dùng `code`
 *  trong khi API trả về `contractCode`, khiến mã hợp đồng luôn là undefined
 *  ở phía Frontend dù server đã trả về đầy đủ. */
export interface ContractRes {
  id: number;
  contractCode: string;
  name: string;
  opportunityId: number | null;
  customerId: number;
  customerName?: string | null;
  quoteId: number | null;
  contractType: ContractType;
  totalValue: number;
  limitValue?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status: ContractStatus;
  notes?: string | null;
  createdBy?: string;
  createdAt?: string;
}

/** Khớp đúng ContractMilestoneStatus (backend enum) — READY_TO_INVOICE dành
 *  cho các story nghiệm thu/hóa đơn tiếp theo, chưa có thao tác ở NCL-04-CN-003. */
export type ContractMilestoneStatus = 'PENDING' | 'READY_TO_INVOICE' | 'INVOICED';

/** Khớp ContractMilestoneRes (backend). */
export interface ContractMilestoneRes {
  id: number;
  contractId: number;
  name: string;
  percentage?: number | null;
  amount: number;
  expectedDate?: string | null;
  acceptanceCondition?: string | null;
  status: ContractMilestoneStatus;
  createdBy?: string | null;
}

/** Một dòng mốc thanh toán trong danh sách gửi lên `PUT /contracts/{id}/milestones`
 *  — backend thay thế trọn bộ danh sách trong một giao dịch (NCL-04-CN-003),
 *  không có API tạo/sửa/xóa từng mốc riêng lẻ. */
export interface ContractMilestoneInput {
  name: string;
  percentage?: number | null;
  amount: number;
  expectedDate?: string | null;
  acceptanceCondition?: string | null;
}

/**
 * Mức độ đã sử dụng hạn mức trần của hợp đồng (NCL-04-CN-005, QTN-19).
 * GET /contracts/{contractId}/usage
 */
export interface ContractUsageRes {
  contractId: number;
  totalValue: number;
  limitValue: number | null;
  usedValue: number;
  remainingValue: number | null;
  usedPercentage: number | null;
  nearLimit: boolean;
  overLimit: boolean;
}

/**
 * Hợp đồng sắp hết hiệu lực, dùng nhắc Kế toán gia hạn trước hạn (NCL-04-CN-006).
 * GET /contracts/expiring?days=30
 *
 * `daysRemaining` >= 0: còn hiệu lực, sắp hết hạn trong khoảng đã chọn (TC-01).
 * `daysRemaining` < 0: đã QUÁ ngày kết thúc nhưng vẫn ở trạng thái ACTIVE (chưa được
 * gia hạn hay đóng lại) — trường hợp khẩn cấp, backend luôn trả về bất kể khung
 * thời gian rà soát đang chọn là bao nhiêu ngày (TC-02).
 */
export interface ContractExpiryAlertRes {
  contractId: number;
  contractCode: string;
  name: string;
  customerId: number;
  customerName?: string | null;
  endDate: string;
  daysRemaining: number;
}

