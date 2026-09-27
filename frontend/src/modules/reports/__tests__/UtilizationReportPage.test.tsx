import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import UtilizationReportPage from '../pages/UtilizationReportPage';
import * as reportsApi from '../api/reportsApi';
import type { UtilizationReportRes } from '../types/utilizationReportTypes';

const mockReport: UtilizationReportRes = {
  from: '2026-02-01',
  to: '2026-02-28',
  totalBillableHours: 300,
  totalStandardHours: 640,
  totalRatio: 0.4688,
  unlistedBillableHours: 24,
  departments: [
    { departmentId: 1, departmentName: 'Phong ky thuat', employeeCount: 3, billableHours: 160, standardHours: 400, ratio: 0.4 },
    { departmentId: null, departmentName: 'Chưa gán bộ phận', employeeCount: 1, billableHours: 80, standardHours: 160, ratio: 0.5 },
  ],
  employees: [
    {
      employeeId: 11,
      userId: 201,
      fullName: 'Nhan su A',
      professionalRole: 'Ky su phan mem',
      departmentId: 1,
      departmentName: 'Phong ky thuat',
      billableHours: 120,
      standardHours: 160,
      ratio: 0.75,
    },
    {
      employeeId: 12,
      userId: 202,
      fullName: 'Nhan su B chua ghi gio',
      professionalRole: 'Tester',
      departmentId: 1,
      departmentName: 'Phong ky thuat',
      billableHours: 0,
      standardHours: 160,
      ratio: 0,
    },
  ],
};

vi.mock('../api/reportsApi', () => ({
  getUtilizationReport: vi.fn(),
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

describe('UtilizationReportPage Component (NCL-11-CN-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportsApi.getUtilizationReport).mockResolvedValue(mockReport);
  });

  describe('Phân quyền truy cập vai trò (TC-04)', () => {
    it('cho phép Ban giám đốc (VT-01) xem báo cáo', () => {
      render(<UtilizationReportPage currentUserRoles={['VT-01']} />);

      expect(screen.getByTestId('utilization-report-page')).toBeInTheDocument();
      expect(reportsApi.getUtilizationReport).not.toHaveBeenCalled();
    });

    it('từ chối vai trò khác và không gọi API báo cáo', () => {
      render(<UtilizationReportPage currentUserRoles={['VT-02']} />);

      expect(screen.getByTestId('utilization-report-access-denied')).toBeInTheDocument();
      expect(reportsApi.getUtilizationReport).not.toHaveBeenCalled();
    });
  });

  describe('Xem theo kỳ (TC-01, TC-02, TC-03)', () => {
    it('gọi API đúng kỳ đã chọn và hiển thị đủ KPI + bảng bộ phận/người', async () => {
      render(<UtilizationReportPage currentUserRoles={['VT-01']} />);

      fireEvent.change(screen.getByTestId('utilization-from-input'), { target: { value: '2026-02-01' } });
      fireEvent.change(screen.getByTestId('utilization-to-input'), { target: { value: '2026-02-28' } });
      fireEvent.click(screen.getByTestId('btn-view-utilization-report'));

      await waitFor(() => {
        expect(reportsApi.getUtilizationReport).toHaveBeenCalledWith('2026-02-01', '2026-02-28');
      });
      expect(await screen.findByTestId('utilization-kpi-grid')).toBeInTheDocument();
      expect(screen.getByTestId('utilization-department-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('utilization-department-row-unassigned')).toBeInTheDocument();
      expect(screen.getByTestId('utilization-employee-row-11')).toBeInTheDocument();
    });

    it('người chưa ghi giờ nào trong kỳ vẫn hiện với tỷ lệ 0% (TC-03)', async () => {
      render(<UtilizationReportPage currentUserRoles={['VT-01']} />);
      fireEvent.click(screen.getByTestId('btn-view-utilization-report'));

      const row = await screen.findByTestId('utilization-employee-row-12');
      expect(row).toHaveTextContent('Nhan su B chua ghi gio');
      expect(row).toHaveTextContent('0,00%');
    });

    it('báo lỗi khi "Từ ngày" sau "Đến ngày" và không gọi API', () => {
      render(<UtilizationReportPage currentUserRoles={['VT-01']} />);

      fireEvent.change(screen.getByTestId('utilization-from-input'), { target: { value: '2026-03-01' } });
      fireEvent.change(screen.getByTestId('utilization-to-input'), { target: { value: '2026-02-01' } });
      fireEvent.click(screen.getByTestId('btn-view-utilization-report'));

      expect(screen.getByTestId('error-utilization-report')).toBeInTheDocument();
      expect(reportsApi.getUtilizationReport).not.toHaveBeenCalled();
    });

    it('hiển thị cảnh báo giờ tính phí chưa gán khi unlistedBillableHours > 0', async () => {
      render(<UtilizationReportPage currentUserRoles={['VT-01']} />);
      fireEvent.click(screen.getByTestId('btn-view-utilization-report'));

      const alert = await screen.findByTestId('utilization-unlisted-alert');
      expect(alert).toHaveTextContent('24,00 giờ tính phí');
    });

    it('hiển thị thông báo lỗi khi API thất bại', async () => {
      vi.mocked(reportsApi.getUtilizationReport).mockRejectedValueOnce(
        new reportsApi.ReportsApiError('UNKNOWN_ERROR', 'Đã có lỗi khi gọi dịch vụ Backend.', 500)
      );

      render(<UtilizationReportPage currentUserRoles={['VT-01']} />);
      fireEvent.click(screen.getByTestId('btn-view-utilization-report'));

      await waitFor(() => {
        expect(screen.getByTestId('utilization-report-error')).toHaveTextContent('Đã có lỗi khi gọi dịch vụ Backend.');
      });
    });
  });

  describe('Tìm kiếm nhân sự trong bảng "Theo từng người"', () => {
    it('lọc danh sách theo từ khóa nhập vào', async () => {
      render(<UtilizationReportPage currentUserRoles={['VT-01']} />);
      fireEvent.click(screen.getByTestId('btn-view-utilization-report'));
      await screen.findByTestId('utilization-employee-row-11');

      fireEvent.change(screen.getByTestId('utilization-employee-search'), { target: { value: 'Nhan su A' } });

      expect(screen.getByTestId('utilization-employee-row-11')).toBeInTheDocument();
      expect(screen.queryByTestId('utilization-employee-row-12')).not.toBeInTheDocument();
    });

    it('hiển thị thông báo khi không tìm thấy nhân sự phù hợp', async () => {
      render(<UtilizationReportPage currentUserRoles={['VT-01']} />);
      fireEvent.click(screen.getByTestId('btn-view-utilization-report'));
      await screen.findByTestId('utilization-employee-row-11');

      fireEvent.change(screen.getByTestId('utilization-employee-search'), { target: { value: 'khong-ton-tai' } });

      expect(screen.getByTestId('utilization-employee-no-match')).toBeInTheDocument();
    });
  });
});
