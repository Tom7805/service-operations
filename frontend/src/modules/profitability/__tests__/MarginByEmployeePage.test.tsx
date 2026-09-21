import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MarginByEmployeePage from '../pages/MarginByEmployeePage';
import * as profitabilityApi from '../api/profitabilityApi';
import type { EmployeeMarginLineRes, MarginByEmployeeRes } from '../types/profitabilityTypes';

vi.mock('../api/profitabilityApi', () => {
  class MockProfitabilityApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'ProfitabilityApiError';
    }
  }

  return {
    getMarginByEmployee: vi.fn(),
    ProfitabilityApiError: MockProfitabilityApiError,
  };
});

const LINE: EmployeeMarginLineRes = {
  employeeId: 17,
  employeeName: 'Nguyễn Văn A',
  professionalRole: 'Lập trình viên',
  approvedHours: 8,
  revenue: 4000000,
  cost: 1600000,
  margin: 2400000,
  marginPercent: 60,
};

const REPORT: MarginByEmployeeRes = {
  periodFrom: '2026-01-01',
  periodTo: '2026-01-31',
  totalRevenue: 6000000,
  totalCost: 2400000,
  totalMargin: 3600000,
  totalMarginPercent: 60,
  lines: [LINE],
  missingCostEntryCount: 0,
  missingRevenueEntryCount: 0,
};

describe('MarginByEmployeePage (NCL-09-CN-005, TC-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho Quản lý dự án (VT-02) — TC-02', () => {
    render(<MarginByEmployeePage currentUserRoles={['VT-02']} />);
    expect(screen.getByTestId('margin-by-employee-forbidden')).toBeInTheDocument();
    expect(profitabilityApi.getMarginByEmployee).not.toHaveBeenCalled();
  });

  it('hiển thị gợi ý chọn kỳ trước khi bấm Xem báo cáo', () => {
    render(<MarginByEmployeePage currentUserRoles={['VT-01']} />);
    expect(screen.getByTestId('margin-by-employee-prompt')).toBeInTheDocument();
  });

  it('tải và hiển thị báo cáo khi bấm Xem báo cáo', async () => {
    vi.mocked(profitabilityApi.getMarginByEmployee).mockResolvedValue(REPORT);

    render(<MarginByEmployeePage currentUserRoles={['VT-01']} />);
    fireEvent.click(screen.getByTestId('btn-view-margin-by-employee'));

    expect(await screen.findByTestId('margin-by-employee-table')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-total-revenue')).toHaveTextContent('6.000.000');
    expect(screen.getByTestId('margin-by-employee-line-17')).toHaveTextContent('Nguyễn Văn A');
    expect(screen.getByTestId('margin-by-employee-line-17')).toHaveTextContent('Lập trình viên');
  });

  it('báo lỗi validate khi thiếu ngày', () => {
    render(<MarginByEmployeePage currentUserRoles={['VT-01']} />);
    fireEvent.change(screen.getByTestId('margin-employee-to-input'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('btn-view-margin-by-employee'));

    expect(screen.getByTestId('error-margin-by-employee')).toHaveTextContent('Vui lòng chọn đầy đủ');
    expect(profitabilityApi.getMarginByEmployee).not.toHaveBeenCalled();
  });

  it('báo lỗi validate khi "Từ ngày" sau "Đến ngày"', () => {
    render(<MarginByEmployeePage currentUserRoles={['VT-01']} />);
    fireEvent.change(screen.getByTestId('margin-employee-from-input'), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByTestId('margin-employee-to-input'), { target: { value: '2026-01-01' } });
    fireEvent.click(screen.getByTestId('btn-view-margin-by-employee'));

    expect(screen.getByTestId('error-margin-by-employee')).toHaveTextContent('không sau');
    expect(profitabilityApi.getMarginByEmployee).not.toHaveBeenCalled();
  });

  it('gọi API đúng tham số from/to đã chọn', async () => {
    vi.mocked(profitabilityApi.getMarginByEmployee).mockResolvedValue(REPORT);

    render(<MarginByEmployeePage currentUserRoles={['VT-01']} />);
    fireEvent.change(screen.getByTestId('margin-employee-from-input'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByTestId('margin-employee-to-input'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByTestId('btn-view-margin-by-employee'));

    await waitFor(() => expect(profitabilityApi.getMarginByEmployee).toHaveBeenCalledWith('2026-01-01', '2026-01-31'));
  });

  it('hiển thị cảnh báo khi có dòng thiếu chi phí hoặc đơn giá', async () => {
    vi.mocked(profitabilityApi.getMarginByEmployee).mockResolvedValue({
      ...REPORT,
      missingCostEntryCount: 3,
      missingRevenueEntryCount: 0,
    });

    render(<MarginByEmployeePage currentUserRoles={['VT-01']} />);
    fireEvent.click(screen.getByTestId('btn-view-margin-by-employee'));

    expect(await screen.findByTestId('margin-by-employee-missing-alert')).toHaveTextContent('3 dòng giờ công chưa có chi phí');
  });

  it('hiển thị "—" cho professionalRole khi trống', async () => {
    vi.mocked(profitabilityApi.getMarginByEmployee).mockResolvedValue({
      ...REPORT,
      lines: [{ ...LINE, professionalRole: null }],
    });

    render(<MarginByEmployeePage currentUserRoles={['VT-01']} />);
    fireEvent.click(screen.getByTestId('btn-view-margin-by-employee'));

    expect(await screen.findByTestId('margin-by-employee-line-17')).toHaveTextContent('—');
  });

  it('hiển thị trạng thái rỗng khi không có dòng nào trong kỳ', async () => {
    vi.mocked(profitabilityApi.getMarginByEmployee).mockResolvedValue({
      ...REPORT,
      totalRevenue: 0,
      totalCost: 0,
      totalMargin: 0,
      totalMarginPercent: null,
      lines: [],
    });

    render(<MarginByEmployeePage currentUserRoles={['VT-01']} />);
    fireEvent.click(screen.getByTestId('btn-view-margin-by-employee'));

    expect(await screen.findByTestId('margin-by-employee-empty')).toBeInTheDocument();
  });

  it('hiển thị trạng thái loading trong khi tải báo cáo', () => {
    vi.mocked(profitabilityApi.getMarginByEmployee).mockImplementation(() => new Promise(() => {}));

    render(<MarginByEmployeePage currentUserRoles={['VT-01']} />);
    fireEvent.click(screen.getByTestId('btn-view-margin-by-employee'));

    expect(screen.getByTestId('margin-by-employee-loading')).toBeInTheDocument();
  });

  it('hiển thị lỗi 403 từ backend', async () => {
    vi.mocked(profitabilityApi.getMarginByEmployee).mockRejectedValue(
      new profitabilityApi.ProfitabilityApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<MarginByEmployeePage currentUserRoles={['VT-01']} />);
    fireEvent.click(screen.getByTestId('btn-view-margin-by-employee'));

    expect(await screen.findByTestId('margin-by-employee-error')).toHaveTextContent(
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });
});
