import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectMarginPage from '../pages/ProjectMarginPage';
import * as profitabilityApi from '../api/profitabilityApi';
import * as projectsApi from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { LaborCostLineRes, ProjectMarginRes, RevenueLineRes } from '../types/profitabilityTypes';

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
    getProjectMargin: vi.fn(),
    ProfitabilityApiError: MockProfitabilityApiError,
  };
});

vi.mock('../../projects/api/projectsApi', () => {
  class MockProjectsApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'ProjectsApiError';
    }
  }

  return {
    getProject: vi.fn(),
    ProjectsApiError: MockProjectsApiError,
  };
});

const RUNNING_PROJECT: ProjectRes = {
  id: 1,
  projectCode: 'PRJ-2026-001',
  name: 'Triển khai CRM cho Khách hàng Alpha',
  contractId: 10,
  customerId: 100,
  projectType: 'STANDARD',
  limitValue: null,
  startDate: '2026-05-01',
  expectedEndDate: '2026-12-31',
  projectManagerId: 5,
  status: 'RUNNING',
  createdAt: '2026-05-01T08:00:00',
};

const LABOR_LINE: LaborCostLineRes = {
  timeEntryId: 100,
  employeeId: 7,
  workDate: '2026-09-10',
  hours: 8.0,
  hourlyRate: 250000,
  laborCost: 2000000,
  missingCostData: false,
};

const LABOR_LINE_MISSING: LaborCostLineRes = {
  timeEntryId: 101,
  employeeId: 8,
  workDate: '2026-09-11',
  hours: 4.0,
  hourlyRate: 0,
  laborCost: 0,
  missingCostData: true,
};

const REVENUE_LINE: RevenueLineRes = {
  timeEntryId: 900,
  employeeId: 7,
  workDate: '2026-09-10',
  hours: 8.0,
  appliedRate: 300000,
  lineRevenue: 2400000,
  billable: true,
  missingRateData: false,
};

const MARGIN_DATA: ProjectMarginRes = {
  projectId: 1,
  recognizedRevenue: 2400000,
  laborCost: 2000000,
  projectExpenseCost: 0,
  subcontractorCost: 0,
  totalCost: 2000000,
  grossProfit: 400000,
  marginRate: 0.1667,
  missingCostEntryCount: 1,
  missingRateEntryCount: 0,
  laborCostLines: [LABOR_LINE, LABOR_LINE_MISSING],
  revenueLines: [REVENUE_LINE],
};

describe('ProjectMarginPage (NCL-09-CN-003 — Biên lợi nhuận thời gian thực)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò không được xem (VT-03)', () => {
    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-03']} />);
    expect(screen.getByTestId('margin-forbidden')).toBeInTheDocument();
    expect(profitabilityApi.getProjectMargin).not.toHaveBeenCalled();
  });

  it('tải và hiển thị biên lợi nhuận của dự án', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectMargin).mockResolvedValue(MARGIN_DATA);

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('margin-page')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-revenue')).toHaveTextContent('2.400.000');
    expect(screen.getByTestId('kpi-gross-profit')).toHaveTextContent('400.000');
    expect(screen.getByTestId('kpi-margin-rate')).toHaveTextContent('16,67%');
  });

  it('VT-01 xem được giá trị thực của hourlyRate/laborCost trong bảng chi tiết', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectMargin).mockResolvedValue(MARGIN_DATA);

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('margin-labor-cost-line-100');
    expect(screen.getByTestId('margin-labor-cost-line-100')).toHaveTextContent('250.000');
    expect(screen.getByTestId('margin-labor-cost-line-100')).toHaveTextContent('2.000.000');
  });

  it('VT-02 (Quản lý dự án) vẫn xem được KPI tổng hợp nhưng bảng chi tiết giá vốn bị che theo QTN-02', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectMargin).mockResolvedValue(MARGIN_DATA);

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-02']} />);

    await screen.findByTestId('margin-labor-cost-line-100');
    // KPI tổng hợp (doanh thu, chi phí, lợi nhuận) KHÔNG bị che — VT-02 vẫn cần thấy bức
    // tranh tổng quát để quản lý dự án (đúng theo data-scope-and-masking.md).
    expect(screen.getByTestId('kpi-revenue')).toHaveTextContent('2.400.000');
    expect(screen.getByTestId('kpi-gross-profit')).toHaveTextContent('400.000');
    // Chỉ riêng từng dòng hourlyRate/laborCost mới bị che.
    expect(screen.getByTestId('margin-labor-cost-line-100')).toContainHTML('•');
  });

  it('VT-05 (Kế toán) xem được giá trị thực trong bảng chi tiết', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectMargin).mockResolvedValue(MARGIN_DATA);

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-05']} />);

    await screen.findByTestId('margin-labor-cost-line-100');
    expect(screen.getByTestId('margin-labor-cost-line-100')).toHaveTextContent('2.000.000');
  });

  it('hiển thị lợi nhuận gộp âm bằng màu khác (dữ liệu lỗ)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectMargin).mockResolvedValue({
      ...MARGIN_DATA,
      grossProfit: -500000,
      marginRate: -0.2,
    });

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-01']} />);

    const el = await screen.findByTestId('kpi-gross-profit');
    expect(el).toHaveTextContent('-500.000');
    expect(el.querySelector('div:last-child')).toHaveStyle({ color: '#B91C1C' });
  });

  it('hiển thị "—" khi marginRate là null (doanh thu bằng 0)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectMargin).mockResolvedValue({
      ...MARGIN_DATA,
      recognizedRevenue: 0,
      grossProfit: -2000000,
      marginRate: null,
    });

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('kpi-margin-rate')).toHaveTextContent('—');
  });

  it('hiển thị cảnh báo khi có dòng thiếu dữ liệu giá vốn hoặc đơn giá', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectMargin).mockResolvedValue(MARGIN_DATA);

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('margin-missing-alert')).toHaveTextContent('1 dòng giờ công chưa có mức chi phí');
  });

  it('đánh dấu dòng doanh thu không tính phí và dòng thiếu đơn giá', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectMargin).mockResolvedValue({
      ...MARGIN_DATA,
      revenueLines: [
        REVENUE_LINE,
        { ...REVENUE_LINE, timeEntryId: 901, billable: false },
        { ...REVENUE_LINE, timeEntryId: 902, missingRateData: true },
      ],
    });

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('margin-revenue-line-900');
    expect(screen.getByTestId('excluded-901')).toBeInTheDocument();
    expect(screen.getByTestId('missing-rate-902')).toBeInTheDocument();
  });

  it('hiển thị trạng thái loading trong khi tải dữ liệu', () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectMargin).mockImplementation(() => new Promise(() => {}));

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-01']} />);

    expect(screen.getByTestId('margin-loading')).toBeInTheDocument();
  });

  it('hiển thị thông báo lỗi khi gọi API thất bại', async () => {
    vi.mocked(profitabilityApi.getProjectMargin).mockRejectedValue(
      new profitabilityApi.ProfitabilityApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('margin-error')).toHaveTextContent(
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });

  it('nút tải lại gọi lại API', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectMargin).mockResolvedValue(MARGIN_DATA);

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('margin-page');
    fireEvent.click(screen.getByTestId('btn-reload-margin'));

    await waitFor(() => expect(profitabilityApi.getProjectMargin).toHaveBeenCalledTimes(2));
  });

  it('nút Tính lại gọi lại API', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectMargin).mockResolvedValue(MARGIN_DATA);

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('margin-page');
    fireEvent.click(screen.getByTestId('btn-recalculate-margin'));

    await waitFor(() => expect(profitabilityApi.getProjectMargin).toHaveBeenCalledTimes(2));
  });

  it('hiển thị trạng thái rỗng cho từng bảng khi không có dòng nào', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectMargin).mockResolvedValue({
      ...MARGIN_DATA,
      missingCostEntryCount: 0,
      missingRateEntryCount: 0,
      laborCostLines: [],
      revenueLines: [],
    });

    render(<ProjectMarginPage projectId={1} currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('margin-labor-cost-empty')).toBeInTheDocument();
    expect(screen.getByTestId('margin-revenue-empty')).toBeInTheDocument();
  });
});
