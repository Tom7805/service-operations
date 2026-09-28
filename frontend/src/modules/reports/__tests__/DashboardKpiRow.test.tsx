import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardKpiRow from '../components/DashboardKpiRow';
import type { DashboardKpiRes } from '../types/reportTypes';

const kpis: DashboardKpiRes = {
  recognizedRevenue: 4000000,
  averageMarginRate: 0.1,
  billableHoursRatio: 0.4444,
  negativeMarginProjectCount: 1,
  overdueInvoiceCount: 2,
};

describe('DashboardKpiRow Component (NCL-11-CN-001)', () => {
  it('hiển thị đủ 5 chỉ số chính đã định dạng', () => {
    render(<DashboardKpiRow kpis={kpis} />);

    expect(screen.getByTestId('kpi-recognized-revenue')).toHaveTextContent('4.000.000');
    expect(screen.getByTestId('kpi-average-margin-rate')).toHaveTextContent('10,00%');
    expect(screen.getByTestId('kpi-billable-hours-ratio')).toHaveTextContent('44,44%');
    expect(screen.getByTestId('kpi-negative-margin-projects')).toHaveTextContent('1');
    expect(screen.getByTestId('kpi-overdue-invoices')).toHaveTextContent('2');
  });

  it('bấm được vào thẻ "Dự án âm biên" và "Hóa đơn quá hạn" để mở màn hình liên quan', () => {
    const onViewNegativeMarginProjects = vi.fn();
    const onViewOverdueInvoices = vi.fn();
    render(
      <DashboardKpiRow
        kpis={kpis}
        onViewNegativeMarginProjects={onViewNegativeMarginProjects}
        onViewOverdueInvoices={onViewOverdueInvoices}
      />
    );

    fireEvent.click(screen.getByTestId('kpi-negative-margin-projects'));
    expect(onViewNegativeMarginProjects).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('kpi-overdue-invoices'));
    expect(onViewOverdueInvoices).toHaveBeenCalledTimes(1);
  });

  it('vô hiệu hóa nút thao tác khi không truyền callback điều hướng', () => {
    render(<DashboardKpiRow kpis={kpis} />);

    expect(screen.getByTestId('kpi-negative-margin-projects')).toBeDisabled();
    expect(screen.getByTestId('kpi-overdue-invoices')).toBeDisabled();
  });
});
