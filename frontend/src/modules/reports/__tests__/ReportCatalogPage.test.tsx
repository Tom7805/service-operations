import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportCatalogPage from '../pages/ReportCatalogPage';
import { isTabVisible, type Tab } from '../../../layouts/menuConfig';

const ROLES = ['VT-01', 'VT-02', 'VT-03', 'VT-04', 'VT-05', 'VT-06', 'VT-07'];

function cardTabs(): Tab[] {
  return screen
    .queryAllByTestId(/^report-card-/)
    .map((el) => el.getAttribute('data-testid')!.replace('report-card-', '') as Tab);
}

describe('ReportCatalogPage', () => {
  it('Quản lý dự án chỉ thấy báo cáo của mình, không thấy báo cáo dành cho Ban giám đốc', () => {
    render(<ReportCatalogPage currentUserRoles={['VT-02']} onOpen={vi.fn()} />);

    expect(cardTabs()).toEqual(['PROJECT_PERFORMANCE_REPORT', 'TIMESHEET_REPORT', 'REPORT_EXPORT', 'FISCAL_PERIODS']);
    expect(screen.queryByTestId('report-card-OPERATIONAL_DASHBOARD')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-card-MARGIN_BY_CUSTOMER')).not.toBeInTheDocument();
  });

  it('Nhân viên kinh doanh chỉ thấy nhóm Kinh doanh; nhóm trống bị ẩn', () => {
    render(<ReportCatalogPage currentUserRoles={['VT-04']} onOpen={vi.fn()} />);

    expect(cardTabs()).toEqual(['PIPELINE_REPORT', 'REVENUE_FORECAST']);
    expect(screen.getByRole('heading', { name: 'Kinh doanh' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Lợi nhuận' })).not.toBeInTheDocument();
  });

  it('bấm thẻ báo cáo mở đúng màn hình', () => {
    const onOpen = vi.fn();
    render(<ReportCatalogPage currentUserRoles={['VT-01']} onOpen={onOpen} />);

    fireEvent.click(screen.getByTestId('report-card-UTILIZATION_REPORT'));
    expect(onOpen).toHaveBeenCalledWith('UTILIZATION_REPORT');
  });

  it.each(ROLES)('mọi thẻ hiện cho %s đều mở được theo phân quyền điều hướng (không có ngõ cụt)', (role) => {
    render(<ReportCatalogPage currentUserRoles={[role]} onOpen={vi.fn()} />);

    for (const tab of cardTabs()) {
      expect(isTabVisible(tab, [role])).toBe(true);
    }
  });
});
