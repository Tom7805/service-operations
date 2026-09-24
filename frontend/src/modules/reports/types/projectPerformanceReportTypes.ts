/** NCL-11-CN-003 — Báo cáo hiệu quả theo dự án. */
export type ProjectPerformanceStatus = 'RUNNING' | 'CLOSED';

/** Các trường giá vốn luôn bị che (`@MaskSensitive(COST)`) với Quản lý dự án — backend trả literal `"***"`. */
export type MaskedCost = number | '***';

export interface ProjectPerformanceRes {
  projectId: number;
  projectCode: string;
  projectName: string;
  status: ProjectPerformanceStatus;
  customerId: number;
  contractId: number;
  contractCode: string;
  contractType: string;
  /** `false` khi hợp đồng của dự án chưa gắn báo giá — mọi trường `planned*` là `null`. */
  planAvailable: boolean;
  quoteId: number | null;
  quoteVersion: number | null;
  plannedHours: number | null;
  actualHours: number;
  hoursVariance: number | null;
  hoursVariancePercent: number | null;
  contractValue: number;
  recognizedRevenue: number;
  revenueRecognitionMethod: string;
  revenueToContractPercent: number | null;
  plannedRevenue: number | null;
  plannedCost: MaskedCost | null;
  actualCost: MaskedCost;
  /** Phần trăm 2 chữ số (18.75 = 18,75%), không phải phân số. */
  plannedMarginPercent: number | null;
  actualMarginPercent: number | null;
  marginGapPercentPoints: number | null;
  hoursVarianceCostImpact: MaskedCost | null;
  hoursVarianceMarginImpactPercentPoints: number | null;
  missingPlannedCostItemCount: number;
  missingActualCostEntryCount: number;
  missingActualRevenueEntryCount: number;
  warnings: string[];
}

export interface ProjectPerformanceReportRes {
  status: ProjectPerformanceStatus | null;
  projectCount: number;
  projectsWithoutPlanCount: number;
  overPlannedHoursProjectCount: number;
  belowPlannedMarginProjectCount: number;
  projects: ProjectPerformanceRes[];
}
