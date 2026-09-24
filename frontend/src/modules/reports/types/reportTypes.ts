/** NCL-11-CN-001 — Bảng điều khiển vận hành. */
export interface DashboardKpiRes {
  recognizedRevenue: number;
  averageMarginRate: number;
  billableHoursRatio: number;
  negativeMarginProjectCount: number;
  overdueInvoiceCount: number;
}

export interface DashboardSummaryRes {
  from: string; // ISO date (YYYY-MM-DD)
  to: string; // ISO date (YYYY-MM-DD)
  kpis: DashboardKpiRes;
  missingCostEntryCount: number;
  missingRevenueEntryCount: number;
}
