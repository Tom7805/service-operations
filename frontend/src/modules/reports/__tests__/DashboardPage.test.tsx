import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DashboardPage from '../pages/DashboardPage';
import * as reportsApi from '../api/reportsApi';
import type { DashboardSummaryRes } from '../types/reportTypes';

const mockSummary: DashboardSummaryRes = {
  from: '2026-01-01',
  to: '2026-01-31',
  kpis: {
    recognizedRevenue: 4000000,
    averageMarginRate: 0.1,
    billableHoursRatio: 0.4444,
    negativeMarginProjectCount: 1,
    overdueInvoiceCount: 2,
  },
  missingCostEntryCount: 0,
  missingRevenueEntryCount: 0,
};

const zeroSummary: DashboardSummaryRes = {
  from: '2026-02-01',
  to: '2026-02-28',
  kpis: {
    recognizedRevenue: 0,
    averageMarginRate: 0,
    billableHoursRatio: 0,
    negativeMarginProjectCount: 0,
    overdueInvoiceCount: 0,
  },
  missingCostEntryCount: 0,
  missingRevenueEntryCount: 0,
};

vi.mock('../api/reportsApi', () => ({
  getDashboardSummary: vi.fn(),
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

describe('DashboardPage Component (NCL-11-CN-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.getDashboardSummary).mockResolvedValue(mockSummary);
  });

  describe('Phân quyền truy cập vai trò (TC-03)', () => {
    it('cho phép Ban giám đốc (VT-01) xem bảng điều khiển', () => {
      render(<DashboardPage currentUserRoles={['VT-01']} />);

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      expect(reportsApi.getDashboardSummary).not.toHaveBeenCalled();
    });

    it('từ chối vai trò khác và không gọi API bảng điều khiển', () => {
      render(<DashboardPage currentUserRoles={['VT-02']} />);

      expect(screen.getByTestId('dashboard-access-denied')).toBeInTheDocument();
      expect(reportsApi.getDashboardSummary).not.toHaveBeenCalled();
    });
  });

  describe('Xem theo kỳ (TC-01, TC-02)', () => {
    it('gọi API đúng kỳ đã chọn và hiển thị đủ 5 chỉ số', async () => {
      render(<DashboardPage currentUserRoles={['VT-01']} />);

      fireEvent.change(screen.getByTestId('dashboard-from-input'), { target: { value: '2026-01-01' } });
      fireEvent.change(screen.getByTestId('dashboard-to-input'), { target: { value: '2026-01-31' } });
      fireEvent.click(screen.getByTestId('btn-view-dashboard'));

      await waitFor(() => {
        expect(reportsApi.getDashboardSummary).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
      });
      expect(await screen.findByTestId('dashboard-kpi-grid')).toBeInTheDocument();
    });

    it('báo lỗi khi "Từ ngày" sau "Đến ngày" và không gọi API', () => {
      render(<DashboardPage currentUserRoles={['VT-01']} />);

      fireEvent.change(screen.getByTestId('dashboard-from-input'), { target: { value: '2026-02-01' } });
      fireEvent.change(screen.getByTestId('dashboard-to-input'), { target: { value: '2026-01-01' } });
      fireEvent.click(screen.getByTestId('btn-view-dashboard'));

      expect(screen.getByTestId('error-dashboard')).toBeInTheDocument();
      expect(reportsApi.getDashboardSummary).not.toHaveBeenCalled();
    });

    it('kỳ không có dữ liệu (TC-02) hiển thị mọi chỉ số bằng 0, không báo lỗi', async () => {
      vi.mocked(reportsApi.getDashboardSummary).mockResolvedValueOnce(zeroSummary);
      render(<DashboardPage currentUserRoles={['VT-01']} />);

      fireEvent.click(screen.getByTestId('btn-view-dashboard'));

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-no-data-note')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('dashboard-error')).not.toBeInTheDocument();
    });

    it('hiển thị cảnh báo thiếu đơn giá vốn/bán khi backend báo có dòng thiếu', async () => {
      vi.mocked(reportsApi.getDashboardSummary).mockResolvedValueOnce({
        ...mockSummary,
        missingCostEntryCount: 2,
        missingRevenueEntryCount: 1,
      });
      render(<DashboardPage currentUserRoles={['VT-01']} />);

      fireEvent.click(screen.getByTestId('btn-view-dashboard'));

      const alert = await screen.findByTestId('dashboard-missing-alert');
      expect(alert).toHaveTextContent('2 dòng giờ công đã duyệt thiếu đơn giá vốn');
      expect(alert).toHaveTextContent('1 dòng giờ công tính phí thiếu đơn giá bán');
    });

    it('hiển thị thông báo lỗi khi API thất bại', async () => {
      vi.mocked(reportsApi.getDashboardSummary).mockRejectedValueOnce(
        new reportsApi.ReportsApiError('UNKNOWN_ERROR', 'Đã có lỗi khi gọi dịch vụ Backend.', 500)
      );

      render(<DashboardPage currentUserRoles={['VT-01']} />);
      fireEvent.click(screen.getByTestId('btn-view-dashboard'));

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-error')).toHaveTextContent('Đã có lỗi khi gọi dịch vụ Backend.');
      });
    });
  });

  describe('Điều hướng sang màn hình liên quan', () => {
    it('bấm "Dự án âm biên"/"Hóa đơn quá hạn" gọi đúng callback điều hướng', async () => {
      const onViewNegativeMarginProjects = vi.fn();
      const onViewOverdueInvoices = vi.fn();
      render(
        <DashboardPage
          currentUserRoles={['VT-01']}
          onViewNegativeMarginProjects={onViewNegativeMarginProjects}
          onViewOverdueInvoices={onViewOverdueInvoices}
        />
      );

      fireEvent.click(screen.getByTestId('btn-view-dashboard'));
      await screen.findByTestId('dashboard-kpi-grid');

      fireEvent.click(screen.getByTestId('kpi-negative-margin-projects'));
      expect(onViewNegativeMarginProjects).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('kpi-overdue-invoices'));
      expect(onViewOverdueInvoices).toHaveBeenCalledTimes(1);
    });
  });
});
