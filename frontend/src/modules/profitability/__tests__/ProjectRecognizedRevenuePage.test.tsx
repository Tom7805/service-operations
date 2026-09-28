import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectRecognizedRevenuePage from '../pages/ProjectRecognizedRevenuePage';
import * as profitabilityApi from '../api/profitabilityApi';
import * as projectsApi from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { RecognizedRevenueRes, RevenueLineRes } from '../types/profitabilityTypes';

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
    getProjectRecognizedRevenue: vi.fn(),
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

const REVENUE_LINE_BILLABLE: RevenueLineRes = {
  timeEntryId: 901,
  employeeId: 17,
  workDate: '2026-06-30',
  hours: 8.0,
  appliedRate: 300000,
  lineRevenue: 2400000,
  billable: true,
  missingRateData: false,
};

const REVENUE_LINE_EXCLUDED: RevenueLineRes = {
  timeEntryId: 902,
  employeeId: 18,
  workDate: '2026-07-01',
  hours: 4.0,
  appliedRate: 0,
  lineRevenue: 0,
  billable: false,
  missingRateData: false,
};

const REVENUE_LINE_MISSING_RATE: RevenueLineRes = {
  timeEntryId: 903,
  employeeId: 19,
  workDate: '2026-07-02',
  hours: 6.0,
  appliedRate: 0,
  lineRevenue: 0,
  billable: true,
  missingRateData: true,
};

const HOURLY_REVENUE: RecognizedRevenueRes = {
  projectId: 1,
  contractId: 5,
  contractType: 'TIME_AND_MATERIAL',
  recognitionMethod: 'HOURLY',
  totalRecognizedRevenue: 2400000,
  totalBillableHours: 8,
  excludedLineCount: 1,
  missingRateEntryCount: 1,
  completionRate: null,
  totalTaskCount: null,
  doneTaskCount: null,
  lines: [REVENUE_LINE_BILLABLE, REVENUE_LINE_EXCLUDED, REVENUE_LINE_MISSING_RATE],
};

const FIXED_PRICE_REVENUE: RecognizedRevenueRes = {
  projectId: 1,
  contractId: 6,
  contractType: 'FIXED_PRICE',
  recognitionMethod: 'PERCENTAGE_OF_COMPLETION',
  totalRecognizedRevenue: 60000000,
  totalBillableHours: null,
  excludedLineCount: 0,
  missingRateEntryCount: 0,
  completionRate: 0.6,
  totalTaskCount: 5,
  doneTaskCount: 3,
  lines: [],
};

describe('ProjectRecognizedRevenuePage (NCL-09-CN-002 — Tính doanh thu ghi nhận dự án)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò không được xem (VT-02)', () => {
    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-02']} />);
    expect(screen.getByTestId('revenue-forbidden')).toBeInTheDocument();
    expect(profitabilityApi.getProjectRecognizedRevenue).not.toHaveBeenCalled();
  });

  it('từ chối truy cập cho vai trò không được xem (VT-03)', () => {
    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-03']} />);
    expect(screen.getByTestId('revenue-forbidden')).toBeInTheDocument();
  });

  it('tải và hiển thị doanh thu ghi nhận — hợp đồng theo giờ (HOURLY)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectRecognizedRevenue).mockResolvedValue(HOURLY_REVENUE);

    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('revenue-page')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-total-revenue')).toHaveTextContent('2.400.000');
    expect(screen.getByTestId('kpi-total-hours')).toHaveTextContent('8,00');
    expect(screen.getByTestId('revenue-line-901')).toHaveTextContent('Mã nhân sự: 17');
  });

  it('VT-05 (Kế toán) xem được màn hình', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectRecognizedRevenue).mockResolvedValue(HOURLY_REVENUE);

    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-05']} />);

    expect(await screen.findByTestId('revenue-page')).toBeInTheDocument();
  });

  it('đánh dấu dòng không tính phí (billable=false) và dòng thiếu đơn giá', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectRecognizedRevenue).mockResolvedValue(HOURLY_REVENUE);

    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('revenue-line-901');
    expect(screen.getByTestId('excluded-902')).toBeInTheDocument();
    expect(screen.getByTestId('missing-rate-903')).toBeInTheDocument();
    expect(screen.getByTestId('billable-901')).toBeInTheDocument();
    expect(screen.getByTestId('rate-ok-901')).toBeInTheDocument();
  });

  it('hiển thị cảnh báo khi có dòng chưa tra được đơn giá', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectRecognizedRevenue).mockResolvedValue(HOURLY_REVENUE);

    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('revenue-line-901');
    expect(screen.getByTestId('revenue-missing-alert')).toHaveTextContent('1 dòng');
  });

  it('tải và hiển thị doanh thu ghi nhận — hợp đồng trọn gói (PERCENTAGE_OF_COMPLETION)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectRecognizedRevenue).mockResolvedValue(FIXED_PRICE_REVENUE);

    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('revenue-page')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-total-revenue')).toHaveTextContent('60.000.000');
    expect(screen.getByTestId('kpi-completion-rate')).toHaveTextContent('60,00%');
    expect(screen.getByTestId('kpi-tasks')).toHaveTextContent('3/5');
    expect(screen.queryByTestId('revenue-detail-table')).not.toBeInTheDocument();
  });

  it('hiển thị trạng thái loading trong khi tải dữ liệu', () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectRecognizedRevenue).mockImplementation(() => new Promise(() => {}));

    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-01']} />);

    expect(screen.getByTestId('revenue-loading')).toBeInTheDocument();
  });

  it('hiển thị thông báo lỗi khi bị từ chối quyền (403)', async () => {
    vi.mocked(profitabilityApi.getProjectRecognizedRevenue).mockRejectedValue(
      new profitabilityApi.ProfitabilityApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('revenue-error')).toHaveTextContent(
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });

  it('hiển thị cảnh báo (không phải lỗi đỏ) khi loại hợp đồng chưa được hỗ trợ (400 INVALID_STATE)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectRecognizedRevenue).mockRejectedValue(
      new profitabilityApi.ProfitabilityApiError(
        'INVALID_STATE',
        'Loại hợp đồng bảo trì chưa được hỗ trợ tính doanh thu ghi nhận.',
        400
      )
    );

    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-01']} />);

    const alertEl = await screen.findByTestId('revenue-error');
    expect(alertEl).toHaveTextContent('chưa được hỗ trợ');
    expect(alertEl.className).toContain('alert-box--warning');
  });

  it('nút tải lại gọi lại API', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectRecognizedRevenue).mockResolvedValue(HOURLY_REVENUE);

    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('revenue-page');
    fireEvent.click(screen.getByTestId('btn-reload-revenue'));

    await waitFor(() => expect(profitabilityApi.getProjectRecognizedRevenue).toHaveBeenCalledTimes(2));
  });

  it('nút Tính lại gọi lại API', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectRecognizedRevenue).mockResolvedValue(HOURLY_REVENUE);

    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('revenue-page');
    fireEvent.click(screen.getByTestId('btn-recalculate-revenue'));

    await waitFor(() => expect(profitabilityApi.getProjectRecognizedRevenue).toHaveBeenCalledTimes(2));
  });

  it('hiển thị trạng thái rỗng khi dự án chưa có giờ công tính phí (HOURLY, lines rỗng)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectRecognizedRevenue).mockResolvedValue({
      ...HOURLY_REVENUE,
      totalRecognizedRevenue: 0,
      totalBillableHours: 0,
      excludedLineCount: 0,
      missingRateEntryCount: 0,
      lines: [],
    });

    render(<ProjectRecognizedRevenuePage projectId={1} currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('revenue-lines-empty')).toBeInTheDocument();
  });
});
