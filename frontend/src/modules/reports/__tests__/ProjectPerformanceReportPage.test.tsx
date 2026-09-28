import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProjectPerformanceReportPage from '../pages/ProjectPerformanceReportPage';
import * as reportsApi from '../api/reportsApi';
import type { ProjectPerformanceReportRes } from '../types/projectPerformanceReportTypes';

const projectWithPlan: ProjectPerformanceReportRes['projects'][number] = {
  projectId: 1,
  projectCode: 'DA-01',
  projectName: 'Trien khai ERP',
  status: 'RUNNING',
  customerId: 3,
  contractId: 500,
  contractCode: 'HD-500',
  contractType: 'TIME_AND_MATERIAL',
  planAvailable: true,
  quoteId: 7,
  quoteVersion: 2,
  plannedHours: 800,
  actualHours: 950,
  hoursVariance: 150,
  hoursVariancePercent: 18.75,
  contractValue: 200000000,
  recognizedRevenue: 95000000,
  revenueRecognitionMethod: 'HOURLY',
  revenueToContractPercent: 47.5,
  plannedRevenue: 120000000,
  plannedCost: '***',
  actualCost: '***',
  plannedMarginPercent: 50,
  actualMarginPercent: 47.37,
  marginGapPercentPoints: -2.63,
  hoursVarianceCostImpact: '***',
  hoursVarianceMarginImpactPercentPoints: -6.25,
  missingPlannedCostItemCount: 0,
  missingActualCostEntryCount: 0,
  missingActualRevenueEntryCount: 0,
  warnings: ['Giờ công thực tế vượt kế hoạch 150.00 giờ (18.75%), làm biên lợi nhuận giảm 6.25 điểm phần trăm.'],
};

const projectWithoutPlan: ProjectPerformanceReportRes['projects'][number] = {
  projectId: 2,
  projectCode: 'DA-02',
  projectName: 'Bao tri website',
  status: 'RUNNING',
  customerId: 4,
  contractId: 501,
  contractCode: 'HD-501',
  contractType: 'TIME_AND_MATERIAL',
  planAvailable: false,
  quoteId: null,
  quoteVersion: null,
  plannedHours: null,
  actualHours: 40,
  hoursVariance: null,
  hoursVariancePercent: null,
  contractValue: 50000000,
  recognizedRevenue: 20000000,
  revenueRecognitionMethod: 'HOURLY',
  revenueToContractPercent: 40,
  plannedRevenue: null,
  plannedCost: '***',
  actualCost: '***',
  plannedMarginPercent: null,
  actualMarginPercent: 35,
  marginGapPercentPoints: null,
  hoursVarianceCostImpact: null,
  hoursVarianceMarginImpactPercentPoints: null,
  missingPlannedCostItemCount: 0,
  missingActualCostEntryCount: 0,
  missingActualRevenueEntryCount: 0,
  warnings: ['Dự án chưa có báo giá gắn kèm nên thiếu dữ liệu kế hoạch để so sánh.'],
};

const mockReport: ProjectPerformanceReportRes = {
  status: null,
  projectCount: 2,
  projectsWithoutPlanCount: 1,
  overPlannedHoursProjectCount: 1,
  belowPlannedMarginProjectCount: 1,
  projects: [projectWithPlan, projectWithoutPlan],
};

vi.mock('../api/reportsApi', () => ({
  getProjectPerformanceReport: vi.fn(),
  ReportsApiError: class extends Error {
    constructor(
      public code: string,
      message: string,
      public statusCode?: number
    ) {
      super(message);
      this.name = 'ReportsApiError';
    }
  },
}));

describe('ProjectPerformanceReportPage Component (NCL-11-CN-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.getProjectPerformanceReport).mockResolvedValue(mockReport);
  });

  describe('Phân quyền truy cập vai trò (TC-03)', () => {
    it('cho phép Quản lý dự án (VT-02) xem báo cáo', async () => {
      render(<ProjectPerformanceReportPage currentUserRoles={['VT-02']} />);

      await waitFor(() => {
        expect(reportsApi.getProjectPerformanceReport).toHaveBeenCalledWith(undefined);
      });
      expect(screen.getByTestId('project-performance-page')).toBeInTheDocument();
    });

    it('từ chối vai trò khác (kể cả VT-01) và không gọi API', () => {
      render(<ProjectPerformanceReportPage currentUserRoles={['VT-01']} />);

      expect(screen.getByTestId('project-performance-access-denied')).toBeInTheDocument();
      expect(reportsApi.getProjectPerformanceReport).not.toHaveBeenCalled();
    });
  });

  describe('Hiển thị dữ liệu báo cáo (TC-01, TC-02)', () => {
    it('hiển thị KPI tổng hợp và chi tiết từng dự án', async () => {
      render(<ProjectPerformanceReportPage currentUserRoles={['VT-02']} />);

      await screen.findByTestId('project-performance-table');
      expect(screen.getByTestId('kpi-project-count')).toHaveTextContent('2');
      expect(screen.getByTestId('project-performance-row-1')).toHaveTextContent('DA-01');
      expect(screen.getByTestId('project-performance-row-2')).toHaveTextContent('DA-02');
    });

    it('dự án chưa có báo giá (TC-02) hiển thị "—" cho các trường kế hoạch, không lỗi', async () => {
      render(<ProjectPerformanceReportPage currentUserRoles={['VT-02']} />);

      const row = await screen.findByTestId('project-performance-row-2');
      expect(row).toHaveTextContent('Thiếu báo giá');
      expect(row).toHaveTextContent('DK: —');
    });

    it('chi phí luôn hiển thị dạng che (***) cho Quản lý dự án (QTN-02)', async () => {
      render(<ProjectPerformanceReportPage currentUserRoles={['VT-02']} />);

      const row = await screen.findByTestId('project-performance-row-1');
      expect(row).toHaveTextContent('***');
    });

    it('lọc theo trạng thái gọi lại API với đúng tham số', async () => {
      render(<ProjectPerformanceReportPage currentUserRoles={['VT-02']} />);
      await screen.findByTestId('project-performance-table');

      fireEvent.change(screen.getByTestId('project-performance-status-filter'), { target: { value: 'RUNNING' } });

      await waitFor(() => {
        expect(reportsApi.getProjectPerformanceReport).toHaveBeenLastCalledWith('RUNNING');
      });
    });

    it('bấm thẻ "Vượt giờ kế hoạch" lọc bảng chỉ còn dự án vượt giờ', async () => {
      render(<ProjectPerformanceReportPage currentUserRoles={['VT-02']} />);
      await screen.findByTestId('project-performance-row-1');

      fireEvent.click(screen.getByTestId('kpi-over-planned-hours-count'));

      expect(screen.getByTestId('project-performance-row-1')).toBeInTheDocument();
      expect(screen.queryByTestId('project-performance-row-2')).not.toBeInTheDocument();
    });

    it('hiển thị thông báo lỗi khi API thất bại', async () => {
      vi.mocked(reportsApi.getProjectPerformanceReport).mockRejectedValueOnce(
        new reportsApi.ReportsApiError('UNKNOWN_ERROR', 'Đã có lỗi khi gọi dịch vụ Backend.', 500)
      );

      render(<ProjectPerformanceReportPage currentUserRoles={['VT-02']} />);

      await waitFor(() => {
        expect(screen.getByTestId('project-performance-error')).toHaveTextContent('Đã có lỗi khi gọi dịch vụ Backend.');
      });
    });
  });

  describe('Điều hướng sang dự án cụ thể', () => {
    it('bấm mã dự án gọi đúng callback onViewProject', async () => {
      const onViewProject = vi.fn();
      render(<ProjectPerformanceReportPage currentUserRoles={['VT-02']} onViewProject={onViewProject} />);

      const row = await screen.findByTestId('project-performance-row-1');
      fireEvent.click(row.querySelector('button')!);

      expect(onViewProject).toHaveBeenCalledWith(1, 'Trien khai ERP');
    });
  });
});
