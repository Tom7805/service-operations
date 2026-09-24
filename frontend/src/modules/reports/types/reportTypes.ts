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
