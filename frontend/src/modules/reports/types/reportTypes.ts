/** NCL-11-CN-004 — khớp enum `ReportType` / `ReportFormat` của backend. */
export type ExportReportType = 'PROJECT_PERFORMANCE';
export type ExportReportFormat = 'CSV';

export interface ReportExportReq {
  reportType: ExportReportType;
  /** yyyy-MM-dd, gồm cả hai đầu kỳ. */
  from: string;
  to: string;
  format?: ExportReportFormat;
}

export interface ExportedReportFile {
  blob: Blob;
  fileName: string;
  rowCount: number;
}

export interface ExportReportOption {
  value: ExportReportType;
  label: string;
  description: string;
}

export const EXPORT_REPORT_OPTIONS: ExportReportOption[] = [
  {
    value: 'PROJECT_PERFORMANCE',
    label: 'Báo cáo hiệu quả theo dự án',
    description:
      'Kế hoạch trong báo giá so với thực tế của các dự án bạn quản lý đang hoạt động trong kỳ: giờ công, doanh thu ghi nhận và biên lợi nhuận.',
  },
];

/** NCL-11-CN-005 — khớp enum `ContractType` của backend. */
export type ContractType = 'TIME_AND_MATERIAL' | 'FIXED_PRICE' | 'MAINTENANCE' | 'MILESTONE';

export const CONTRACT_TYPE_ORDER: ContractType[] = ['TIME_AND_MATERIAL', 'FIXED_PRICE', 'MAINTENANCE', 'MILESTONE'];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  TIME_AND_MATERIAL: 'Theo giờ',
  FIXED_PRICE: 'Trọn gói',
  MAINTENANCE: 'Duy trì',
  MILESTONE: 'Theo mốc',
};

export interface MonthlyRevenueRes {
  /** yyyy-MM */
  month: string;
  revenue: number;
  byContractType: Record<ContractType, number>;
  previousYearRevenue: number;
  /** Số phần trăm 2 chữ số; null khi năm trước bằng 0. */
  changePercent: number | null;
}

export interface MonthlyRevenueReportRes {
  fromMonth: string;
  toMonth: string;
  hasData: boolean;
  totalRevenue: number;
  totalByContractType: Record<ContractType, number>;
  previousYearTotalRevenue: number;
  totalChangePercent: number | null;
  months: MonthlyRevenueRes[];
  missingRevenueEntryCount: number;
  warnings: string[];
}
