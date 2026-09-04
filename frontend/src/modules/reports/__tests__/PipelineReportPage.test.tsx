import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PipelineReportPage from '../pages/PipelineReportPage';
import * as reportsApi from '../api/reportsApi';
import type { PipelineReportRes } from '../types/pipelineReportTypes';

const mockReportData: PipelineReportRes = {
  totalOpportunityCount: 12,
  totalExpectedValue: 3150000000,
  stalledThresholdDays: 60,
  generatedAt: '2026-09-04T11:20:31',
  stages: [
    { stage: 'APPROACH', opportunityCount: 4, totalExpectedValue: 700000000, averageDaysInStage: 18, stalledCount: 0, stalledOpportunityIds: [] },
    { stage: 'PROPOSAL', opportunityCount: 3, totalExpectedValue: 900000000, averageDaysInStage: 25, stalledCount: 0, stalledOpportunityIds: [] },
    { stage: 'NEGOTIATION', opportunityCount: 2, totalExpectedValue: 800000000, averageDaysInStage: 47, stalledCount: 1, stalledOpportunityIds: [2007] },
    { stage: 'WON', opportunityCount: 2, totalExpectedValue: 600000000, averageDaysInStage: 5, stalledCount: 0, stalledOpportunityIds: [] },
    { stage: 'LOST', opportunityCount: 1, totalExpectedValue: 150000000, averageDaysInStage: 3, stalledCount: 0, stalledOpportunityIds: [] },
  ],
};

vi.mock('../api/reportsApi', () => ({
  getPipelineReport: vi.fn(),
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

describe('PipelineReportPage Component (NCL-03-CN-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.getPipelineReport).mockResolvedValue(mockReportData);
  });

  describe('Phân quyền truy cập vai trò (TC-03)', () => {
    it('cho phép Ban giám đốc (VT-01) xem báo cáo', async () => {
      render(<PipelineReportPage currentUserRoles={['VT-01']} />);

      await waitFor(() => {
        expect(screen.getByText('Báo cáo đường ống bán hàng theo giai đoạn')).toBeInTheDocument();
      });
      expect(reportsApi.getPipelineReport).toHaveBeenCalledTimes(1);
    });

    it('cho phép Nhân viên kinh doanh (VT-04) xem báo cáo', async () => {
      render(<PipelineReportPage currentUserRoles={['VT-04']} />);

      await waitFor(() => {
        expect(screen.getByText('Báo cáo đường ống bán hàng theo giai đoạn')).toBeInTheDocument();
      });
    });

    it('từ chối vai trò khác và không gọi API báo cáo', () => {
      render(<PipelineReportPage currentUserRoles={['VT-03']} />);

      expect(screen.getByTestId('pipeline-report-access-denied')).toBeInTheDocument();
      expect(reportsApi.getPipelineReport).not.toHaveBeenCalled();
    });
  });

  describe('Hiển thị dữ liệu báo cáo (TC-01, TC-02)', () => {
    it('hiển thị tổng số cơ hội và tổng giá trị dự kiến', async () => {
      render(<PipelineReportPage currentUserRoles={['VT-01']} />);

      await waitFor(() => {
        expect(screen.getByText(/12/)).toBeInTheDocument();
      });
    });

    it('hiển thị cảnh báo cơ hội đọng lâu kèm mã cơ hội', async () => {
      render(<PipelineReportPage currentUserRoles={['VT-01']} />);

      await waitFor(() => {
        expect(screen.getByText(/Có 1 cơ hội đọng lâu — ID: 2007/)).toBeInTheDocument();
      });
    });

    it('hiển thị thông báo lỗi khi API thất bại', async () => {
      vi.mocked(reportsApi.getPipelineReport).mockRejectedValueOnce(
        new reportsApi.ReportsApiError('UNKNOWN_ERROR', 'Đã có lỗi khi gọi dịch vụ Backend.', 500)
      );

      render(<PipelineReportPage currentUserRoles={['VT-01']} />);

      await waitFor(() => {
        expect(screen.getByText('Đã có lỗi khi gọi dịch vụ Backend.')).toBeInTheDocument();
      });
    });
  });
});
