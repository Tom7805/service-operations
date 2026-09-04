/**
 * Kiểu dữ liệu cho module Cơ hội bán hàng (Opportunities)
 * và Dự báo doanh thu theo xác suất giai đoạn (NCL-03-CN-004)
 */

export type OpportunityStage =
  "APPROACH" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

export type OpportunityStatus = "OPEN" | "CLOSED";

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
    label: "Thương lượng",
    defaultProbability: 70,
  },
  WON: {
    code: "WON",
    label: "Đã thắng (Chốt hợp đồng)",
    defaultProbability: 100,
  },
  LOST: { code: "LOST", label: "Đã thất bại", defaultProbability: 0 },
};

/** Dự báo doanh thu theo từng tháng (NCL-03-CN-004, TC-01) */
export interface MonthlyRevenueForecast {
  /** Định dạng tháng YYYY-MM (ví dụ: '2026-09') */
  month: string;
  /** Doanh thu kỳ vọng đã nhân xác suất (VNĐ) */
  expectedRevenue: number;
  /** Số lượng cơ hội mở có ngày dự kiến ký trong tháng */
  opportunityCount: number;
}

/** Dữ liệu trả về từ API dự báo doanh thu */
export interface RevenueForecastData {
  /** Tổng doanh thu kỳ vọng của tất cả các tháng trong khoảng lọc (VNĐ) */
  totalExpectedRevenue: number;
  /** Danh sách dự báo doanh thu phân bổ theo từng tháng tăng dần */
  months: MonthlyRevenueForecast[];
}

/** Tham số lọc truy vấn dự báo doanh thu (GET /opportunities/revenue-forecast) */
export interface ForecastQueryParams {
  /** Tháng/ngày bắt đầu (định dạng YYYY-MM-DD hoặc YYYY-MM) */
  from?: string;
  /** Tháng/ngày kết thúc (định dạng YYYY-MM-DD hoặc YYYY-MM) */
  to?: string;
}
