/**
 * Kiểu dữ liệu cho module Cơ hội bán hàng (Opportunities)
 * Story NCL-03-CN-005: Ghi nhận kết quả thắng thua của cơ hội
 * Story NCL-03-CN-004: Dự báo doanh thu theo xác suất giai đoạn
 */

export type OpportunityStage =
  "APPROACH" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

export type OpportunityStatus = "OPEN" | "CLOSED";

/**
 * 7 lý do thua chuẩn hóa theo backend LossReason.java (NCL-03-CN-005, TC-01, TC-02)
 */
export type LossReason =
  | "PRICE_TOO_HIGH"
  | "LOST_TO_COMPETITOR"
  | "BUDGET_CUT"
  | "TIMING_NOT_RIGHT"
  | "REQUIREMENT_MISMATCH"
  | "NO_RESPONSE"
  | "OTHER";

export interface LossReasonOption {
  value: LossReason;
  label: string;
  description: string;
}

export const LOSS_REASON_OPTIONS: LossReasonOption[] = [
  {
    value: "PRICE_TOO_HIGH",
    label: "Giá cao hơn kỳ vọng / ngân sách",
    description:
      "Giá đề xuất cao hơn kỳ vọng hoặc ngân sách cho phép của khách hàng",
  },
  {
    value: "LOST_TO_COMPETITOR",
    label: "Mất vào tay đối thủ cạnh tranh",
    description:
      "Khách hàng chọn giải pháp hoặc dịch vụ của đối thủ cạnh tranh khác",
  },
  {
    value: "BUDGET_CUT",
    label: "Khách hàng bị cắt / hết ngân sách",
    description:
      "Dự án của khách hàng bị cắt hoặc không còn nguồn ngân sách triển khai",
  },
  {
    value: "TIMING_NOT_RIGHT",
    label: "Thời điểm chưa phù hợp / Hoãn dự án",
    description:
      "Khách hàng quyết định hoãn hoặc tạm dừng dự án sang thời điểm khác",
  },
  {
    value: "REQUIREMENT_MISMATCH",
    label: "Năng lực / giải pháp chưa đáp ứng yêu cầu",
    description:
      "Giải pháp hoặc năng lực đề xuất chưa hoàn toàn khớp với bài toán khách hàng",
  },
  {
    value: "NO_RESPONSE",
    label: "Khách hàng ngừng phản hồi",
    description:
      "Khách hàng ngừng liên lạc, không phản hồi các đề xuất tiếp theo",
  },
  {
    value: "OTHER",
    label: "Lý do khác",
    description: "Lý do khác ngoài các mục trên (chi tiết xem ở phần ghi chú)",
  },
];

export interface OpportunityStageInfo {
  code: OpportunityStage;
  label: string;
  defaultProbability: number;
}

export const OPPORTUNITY_STAGES: Record<
  OpportunityStage,
  OpportunityStageInfo
> = {
  APPROACH: { code: "APPROACH", label: "Tiếp cận", defaultProbability: 10 },
  PROPOSAL: {
    code: "PROPOSAL",
    label: "Đề xuất / Báo giá",
    defaultProbability: 40,
  },
  NEGOTIATION: {
    code: "NEGOTIATION",
    label: "Thương lượng / Đàm phán",
    defaultProbability: 70,
  },
  WON: {
    code: "WON",
    label: "Đã thắng (Chốt hợp đồng)",
    defaultProbability: 100,
  },
  LOST: { code: "LOST", label: "Đã thất bại (Thua)", defaultProbability: 0 },
};

/** Dữ liệu chi tiết cơ hội bán hàng */
export interface Opportunity {
  id: number;
  name: string;
  customerId?: number;
  customerName?: string;
  expectedValue?: number;
  expectedCloseDate?: string;
  stage: OpportunityStage;
  status: OpportunityStatus;
  probability?: number;
  ownerId?: number;
  createdBy?: string;
  createdAt?: string;
  /** Chỉ có giá trị khi stage = LOST */
  lossReason?: LossReason | null;
  /** Ghi chú chi tiết kết quả lúc đóng */
  closeReasonDetail?: string | null;
  /** Tên đối thủ cạnh tranh nếu có */
  competitorName?: string | null;
  /** Thời điểm đóng cơ hội */
  closedAt?: string | null;
}

/** Request payload đóng cơ hội với kết quả thắng/thua (POST /opportunities/{id}/close) */
export interface OpportunityClosePayload {
  result: "WON" | "LOST";
  lossReason?: LossReason;
  reasonDetail?: string;
  competitorName?: string;
}

/** Lịch sử chuyển giai đoạn của cơ hội */
export interface StageHistoryItem {
  id: number;
  opportunityId: number;
  fromStage: string | null;
  toStage: string;
  changedByUsername: string;
  changedAt: string;
}

/** Dự báo doanh thu theo từng tháng (NCL-03-CN-004) */
export interface MonthlyRevenueForecast {
  month: string;
  expectedRevenue: number;
  opportunityCount: number;
}

export interface RevenueForecastData {
  totalExpectedRevenue: number;
  months: MonthlyRevenueForecast[];
}

export interface ForecastQueryParams {
  from?: string;
  to?: string;
}
