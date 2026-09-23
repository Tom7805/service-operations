import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MarginByCustomerPage from '../pages/MarginByCustomerPage';
import * as profitabilityApi from '../api/profitabilityApi';
import type { CustomerMarginLineRes, MarginByCustomerRes } from '../types/profitabilityTypes';

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
    getMarginByCustomer: vi.fn(),
    ProfitabilityApiError: MockProfitabilityApiError,
  };
});

const LINE: CustomerMarginLineRes = {
  customerId: 1000,
  customerCode: 'KH001',
  customerName: 'Công ty A',
  approvedHours: 8,
  revenue: 4000000,
  cost: 1600000,
  margin: 2400000,
  marginPercent: 60,
};

const REPORT: MarginByCustomerRes = {
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

describe('MarginByCustomerPage (NCL-09-CN-005, TC-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò không phải VT-01', () => {
    render(<MarginByCustomerPage currentUserRoles={['VT-02']} />);
    expect(screen.getByTestId('margin-by-customer-forbidden')).toBeInTheDocument();
    expect(profitabilityApi.getMarginByCustomer).not.toHaveBeenCalled();
  });

  it('hiển thị gợi ý chọn kỳ trước khi bấm Xem báo cáo', () => {
    render(<MarginByCustomerPage currentUserRoles={['VT-01']} />);
    expect(screen.getByTestId('margin-by-customer-prompt')).toBeInTheDocument();
    expect(profitabilityApi.getMarginByCustomer).not.toHaveBeenCalled();
  });

  it('tải và hiển thị báo cáo khi bấm Xem báo cáo', async () => {
    vi.mocked(profitabilityApi.getMarginByCustomer).mockResolvedValue(REPORT);

    render(<MarginByCustomerPage currentUserRoles={['VT-01']} />);
    fireEvent.click(screen.getByTestId('btn-view-margin-by-customer'));

    expect(await screen.findByTestId('margin-by-customer-table')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-total-revenue')).toHaveTextContent('6.000.000');
    expect(screen.getByTestId('kpi-total-margin-percent')).toHaveTextContent('60,00%');
    expect(screen.getByTestId('margin-by-customer-line-1000')).toHaveTextContent('Công ty A');
    expect(screen.getByTestId('margin-by-customer-line-1000')).toHaveTextContent('KH001');
  });

  it('báo lỗi validate khi thiếu ngày', () => {
    render(<MarginByCustomerPage currentUserRoles={['VT-01']} />);
    fireEvent.change(screen.getByTestId('margin-customer-from-input'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('btn-view-margin-by-customer'));

    expect(screen.getByTestId('error-margin-by-customer')).toHaveTextContent('Vui lòng chọn đầy đủ');
    expect(profitabilityApi.getMarginByCustomer).not.toHaveBeenCalled();
  });

  it('báo lỗi validate khi "Từ ngày" sau "Đến ngày"', () => {
    render(<MarginByCustomerPage currentUserRoles={['VT-01']} />);
    fireEvent.change(screen.getByTestId('margin-customer-from-input'), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByTestId('margin-customer-to-input'), { target: { value: '2026-01-01' } });
    fireEvent.click(screen.getByTestId('btn-view-margin-by-customer'));

    expect(screen.getByTestId('error-margin-by-customer')).toHaveTextContent('không sau');
    expect(profitabilityApi.getMarginByCustomer).not.toHaveBeenCalled();
  });

  it('gọi API đúng tham số from/to đã chọn', async () => {
    vi.mocked(profitabilityApi.getMarginByCustomer).mockResolvedValue(REPORT);

    render(<MarginByCustomerPage currentUserRoles={['VT-01']} />);
    fireEvent.change(screen.getByTestId('margin-customer-from-input'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByTestId('margin-customer-to-input'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByTestId('btn-view-margin-by-customer'));

    await waitFor(() => expect(profitabilityApi.getMarginByCustomer).toHaveBeenCalledWith('2026-01-01', '2026-01-31'));
  });

  it('hiển thị cảnh báo khi có dòng thiếu chi phí hoặc đơn giá', async () => {
    vi.mocked(profitabilityApi.getMarginByCustomer).mockResolvedValue({
      ...REPORT,
      missingCostEntryCount: 2,
      missingRevenueEntryCount: 1,
    });

    render(<MarginByCustomerPage currentUserRoles={['VT-01']} />);
    fireEvent.click(screen.getByTestId('btn-view-margin-by-customer'));

    expect(await screen.findByTestId('margin-by-customer-missing-alert')).toHaveTextContent('2 dòng giờ công chưa có chi phí');
    expect(screen.getByTestId('margin-by-customer-missing-alert')).toHaveTextContent('1 dòng giờ công tính phí');
  });

  it('hiển thị "—" khi marginPercent null (không có doanh thu)', async () => {
    vi.mocked(profitabilityApi.getMarginByCustomer).mockResolvedValue({
      ...REPORT,
      totalRevenue: 0,
      totalMarginPercent: null,
      lines: [{ ...LINE, revenue: 0, marginPercent: null }],
    });

    render(<MarginByCustomerPage currentUserRoles={['VT-01']} />);
    fireEvent.click(screen.getByTestId('btn-view-margin-by-customer'));

    expect(await screen.findByTestId('kpi-total-margin-percent')).toHaveTextContent('—');
  });

  it('hiển thị trạng thái rỗng khi không có dòng nào trong kỳ', async () => {
    vi.mocked(profitabilityApi.getMarginByCustomer).mockResolvedValue({
      ...REPORT,
      totalRevenue: 0,
      totalCost: 0,
      totalMargin: 0,
      totalMarginPercent: null,
      lines: [],
    });

    render(<MarginByCustomerPage currentUserRoles={['VT-01']} />);
    fireEvent.click(screen.getByTestId('btn-view-margin-by-customer'));

    expect(await screen.findByTestId('margin-by-customer-empty')).toBeInTheDocument();
  });

  it('hiển thị trạng thái loading trong khi tải báo cáo', () => {
    vi.mocked(profitabilityApi.getMarginByCustomer).mockImplementation(() => new Promise(() => {}));

    render(<MarginByCustomerPage currentUserRoles={['VT-01']} />);
    fireEvent.click(screen.getByTestId('btn-view-margin-by-customer'));

    expect(screen.getByTestId('margin-by-customer-loading')).toBeInTheDocument();
  });

  it('hiển thị lỗi 403 từ backend', async () => {
    vi.mocked(profitabilityApi.getMarginByCustomer).mockRejectedValue(
      new profitabilityApi.ProfitabilityApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<MarginByCustomerPage currentUserRoles={['VT-01']} />);
    fireEvent.click(screen.getByTestId('btn-view-margin-by-customer'));

    expect(await screen.findByTestId('margin-by-customer-error')).toHaveTextContent(
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });
});
