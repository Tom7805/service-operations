/**
 * Định nghĩa các kiểu dữ liệu cho mô-đun Cơ hội bán hàng (Sales Opportunity Module)
 * Tuân thủ Backend API Contract NCL-03-CN-001 & NCL-03-CN-002
 */

export type OpportunityStage =
  | 'APPROACH'    // Tiếp cận (10% xác suất) - giai đoạn khởi tạo (QTN-06)
  | 'PROPOSAL'    // Đề xuất giải pháp (40% xác suất)
  | 'NEGOTIATION' // Đàm phán thương thảo (70% xác suất)
  | 'WON'         // Chốt thành công (100% xác suất, đóng cơ hội)
  | 'LOST';       // Thất bại (0% xác suất, đóng cơ hội)

export type OpportunityStatus =
  | 'OPEN'        // Đang xử lý
  | 'CLOSED';     // Đã đóng (khi đạt WON hoặc LOST)

export interface Opportunity {
  id: number;
  code?: string;
  name: string;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  expectedValue: number;
  expectedCloseDate?: string | null;
  stage: OpportunityStage | string;
  status: OpportunityStatus | string;
  probability: number; // Xác suất trúng % (10, 40, 70, 100, 0)
  ownerId?: number | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OpportunityCreatePayload {
  name: string;
  customerId: number;
  expectedValue: number;
  expectedCloseDate?: string | null;
  ownerId?: number | null;
}

export interface OpportunityCreateResponse {
  success: boolean;
  message: string;
  data: Opportunity;
}

export interface StageChangePayload {
  targetStage: OpportunityStage;
}

export interface StageHistoryItem {
  id: number;
  opportunityId: number;
  fromStage: OpportunityStage | string | null;
  toStage: OpportunityStage | string;
  changedByUsername?: string | null;
  changedAt: string;
}

export interface OpportunityFormErrors {
  name?: string;
  customerId?: string;
  expectedValue?: string;
  expectedCloseDate?: string;
  targetStage?: string;
  general?: string;
}

export interface CustomerOption {
  id: number;
  code: string;
  name: string;
  status?: string | null;
}

/** Cấu hình thông tin các giai đoạn bán hàng */
export interface StageMeta {
  key: OpportunityStage;
  label: string;
  shortLabel: string;
  defaultProbability: number;
  description: string;
}

export const STAGE_CONFIGS: Record<OpportunityStage, StageMeta> = {
  APPROACH: {
    key: 'APPROACH',
    label: 'Tiếp cận ban đầu',
    shortLabel: 'Tiếp cận',
    defaultProbability: 10,
    description: 'Xác định nhu cầu sơ bộ và thiết lập liên hệ với khách hàng',
  },
  PROPOSAL: {
    key: 'PROPOSAL',
    label: 'Đề xuất giải pháp',
    shortLabel: 'Đề xuất',
    defaultProbability: 40,
    description: 'Trình bày giải pháp kỹ thuật, báo giá và phạm vi dịch vụ',
  },
  NEGOTIATION: {
    key: 'NEGOTIATION',
    label: 'Đàm phán thương thảo',
    shortLabel: 'Đàm phán',
    defaultProbability: 70,
    description: 'Thương lượng điều khoản hợp đồng, chi phí và tiến độ',
  },
  WON: {
    key: 'WON',
    label: 'Chốt thành công',
    shortLabel: 'Thành công',
    defaultProbability: 100,
    description: 'Ký kết hợp đồng thành công, cơ hội được đóng với kết quả Thắng',
  },
  LOST: {
    key: 'LOST',
    label: 'Đóng thất bại',
    shortLabel: 'Thất bại',
    defaultProbability: 0,
    description: 'Khách hàng từ chối hoặc dừng dự án, cơ hội đóng với kết quả Thua',
  },
};

/** Thứ tự các giai đoạn đang hoạt động (ACTIVE) */
export const ACTIVE_STAGES_ORDER: OpportunityStage[] = ['APPROACH', 'PROPOSAL', 'NEGOTIATION'];

/* -------------------------------------------------------------------------- */
/*  Lập báo giá cho cơ hội (NCL-03-CN-003)                                     */
/* -------------------------------------------------------------------------- */

/** Dòng báo giá gửi lên máy chủ (POST /opportunities/{id}/quotes) */
export interface QuoteItemReq {
  professionalRole: string;
  workDays: number;
}

/** Yêu cầu lập báo giá cho cơ hội */
export interface QuoteCreateReq {
  items: QuoteItemReq[];
}

/** Dòng báo giá trả về từ máy chủ sau khi áp đơn giá */
export interface QuoteItemRes {
  id?: number;
  professionalRole: string;
  workDays: number;
  unitRate: number | null;
  amount: number | null;
  priced: boolean;
}

/** Bản ghi báo giá hoàn chỉnh từ máy chủ */
export interface QuoteRes {
  id: number;
  opportunityId: number;
  version: number;
  totalAmount: number;
  currency?: string;
  effectiveDate?: string;
  items: QuoteItemRes[];
  missingRates: string[];
  createdBy?: string;
  createdAt?: string;
}

/** Danh sách vai trò chuyên môn phổ biến để gợi ý khi lập báo giá */
export const POPULAR_PROFESSIONAL_ROLES = [
  'Quản lý dự án (Project Manager)',
  'Kiến trúc sư giải pháp (Solution Architect)',
  'Lập trình viên cao cấp (Senior Developer)',
  'Lập trình viên (Developer)',
  'Kỹ sư kiểm thử phần mềm (QA/QC Engineer)',
  'Thiết kế giao diện & trải nghiệm (UI/UX Designer)',
  'Kỹ sư hệ thống / DevOps (DevOps Engineer)',
  'Chuyên viên phân tích nghiệp vụ (Business Analyst)',
];

/* -------------------------------------------------------------------------- */
/*  Dự báo doanh thu theo xác suất giai đoạn (NCL-03-CN-004)                   */
/* -------------------------------------------------------------------------- */

/** Dự báo doanh thu của một tháng (NCL-03-CN-004, TC-01) */
export interface MonthlyRevenueForecast {
  /** Định dạng tháng YYYY-MM (ví dụ: '2026-09') */
  month: string;
  /** Doanh thu kỳ vọng đã nhân xác suất giai đoạn (VNĐ) */
  expectedRevenue: number;
  /** Số cơ hội mở có ngày dự kiến ký nằm trong tháng */
  opportunityCount: number;
}

/** Dữ liệu trả về từ API dự báo doanh thu (GET /opportunities/revenue-forecast) */
export interface RevenueForecastData {
  /** Tổng doanh thu kỳ vọng của các tháng trong khoảng lọc (VNĐ) */
  totalExpectedRevenue: number;
  /** Danh sách dự báo theo từng tháng, tăng dần theo thời gian */
  months: MonthlyRevenueForecast[];
}

/** Tham số lọc thời gian cho báo cáo dự báo doanh thu */
export interface ForecastQueryParams {
  /** Ngày/tháng bắt đầu (YYYY-MM-DD hoặc YYYY-MM) */
  from?: string;
  /** Ngày/tháng kết thúc (YYYY-MM-DD hoặc YYYY-MM) */
  to?: string;
}
