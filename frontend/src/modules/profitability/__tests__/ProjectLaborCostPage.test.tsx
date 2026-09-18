import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectLaborCostPage from '../pages/ProjectLaborCostPage';
import * as profitabilityApi from '../api/profitabilityApi';
import * as projectsApi from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { LaborCostLineRes, ProjectLaborCostRes } from '../types/profitabilityTypes';

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
    getProjectLaborCost: vi.fn(),
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

const LABOR_LINE_COMPLETED: LaborCostLineRes = {
  timeEntryId: 100,
  employeeId: 7,
  workDate: '2026-09-10',
  hours: 8.0,
  hourlyRate: 250000,
  laborCost: 2000000,
  missingCostData: false,
};

const LABOR_LINE_MISSING_COST: LaborCostLineRes = {
  timeEntryId: 101,
  employeeId: 8,
  workDate: '2026-09-11',
  hours: 6.5,
  hourlyRate: 0,
  laborCost: 0,
  missingCostData: true,
};

const LABOR_COST_DATA: ProjectLaborCostRes = {
  projectId: 1,
  totalApprovedHours: 14.5,
  totalLaborCost: 2375000,
  missingCostEntryCount: 1,
  lines: [LABOR_LINE_COMPLETED, LABOR_LINE_MISSING_COST],
};

describe('ProjectLaborCostPage (NCL-09-CN-001 — Tính giá vốn giờ công dự án)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò không được xem (VT-03)', () => {
    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-03']} />);
    expect(screen.getByTestId('labor-cost-forbidden')).toBeInTheDocument();
    expect(profitabilityApi.getProjectLaborCost).not.toHaveBeenCalled();
  });

  it('tải và hiển thị giá vốn giờ công của dự án', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('labor-cost-page')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-total-hours')).toHaveTextContent('14,50');
    expect(screen.getByTestId('labor-cost-line-100')).toHaveTextContent('Mã nhân sự: 7');
    expect(screen.getByTestId('labor-cost-line-101')).toHaveTextContent('Mã nhân sự: 8');
  });

  it('VT-01 thấy giá trị thực của hourlyRate và laborCost (có quyền dữ liệu lương)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('labor-cost-line-100');
    expect(screen.getByTestId('labor-cost-line-100')).toHaveTextContent('250.000 ₫');
    expect(screen.getByTestId('labor-cost-line-100')).toHaveTextContent('2.000.000 ₫');
  });

  it('VT-02 không thấy giá trị thực của total cost (không có quyền dữ liệu lương), bảng chi tiết được ẩn', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-02']} />);

    await screen.findByTestId('kpi-total-cost');
    expect(screen.getByTestId('kpi-total-cost')).toContainHTML('•');
    // VT-02 (Project Manager) ẩn bảng chi tiết theo RBAC
    expect(screen.queryByTestId('labor-cost-line-100')).not.toBeInTheDocument();
    expect(screen.getByTestId('table-hidden-notice')).toBeInTheDocument();
  });

  it('VT-05 thấy giá trị thực (có quyền dữ liệu lương)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-05']} />);

    await screen.findByTestId('labor-cost-line-100');
    expect(screen.getByTestId('labor-cost-line-100')).toHaveTextContent('2.000.000 ₫');
  });

  it('hiển thị cảnh báo khi có dòng giờ công chưa có dữ liệu giá vốn', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('labor-cost-line-100');
    expect(screen.getByTestId('labor-cost-missing-alert')).toHaveTextContent('1 dòng');
  });

  it('đánh dấu dòng chưa có dữ liệu giá vốn bằng icon cảnh báo', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('labor-cost-line-100');
    expect(screen.getByTestId('missing-cost-101')).toBeInTheDocument();
    expect(screen.getByTestId('cost-ok-100')).toBeInTheDocument();
  });

  it('hiển thị trạng thái loading trong khi tải dữ liệu', () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockImplementation(() => new Promise(() => {}));

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-01']} />);

    expect(screen.getByTestId('labor-cost-loading')).toBeInTheDocument();
  });

  it('hiển thị thông báo lỗi khi gọi API thất bại', async () => {
    vi.mocked(profitabilityApi.getProjectLaborCost).mockRejectedValue(
      new profitabilityApi.ProfitabilityApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('labor-cost-error')).toHaveTextContent(
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });

  it('hiển thị trạng thái rỗng khi dự án chưa có giờ công đã duyệt', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue({
      projectId: 1,
      totalApprovedHours: 0,
      totalLaborCost: 0,
      missingCostEntryCount: 0,
      lines: [],
    });

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('labor-cost-empty')).toBeInTheDocument();
  });

  it('hiển thị mã dự án khi không lấy được thông tin dự án', async () => {
    vi.mocked(projectsApi.getProject).mockRejectedValue(new Error('not found'));
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('labor-cost-line-100');
    expect(screen.getByText('Mã: 1')).toBeInTheDocument();
  });

  it('nút tải lại gọi lại API', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('labor-cost-line-100');
    fireEvent.click(screen.getByTestId('btn-reload-labor-cost'));

    await waitFor(() => expect(profitabilityApi.getProjectLaborCost).toHaveBeenCalledTimes(2));
  });

  it('hiển thị nút Recalculate', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('labor-cost-line-100');
    expect(screen.getByTestId('btn-recalculate-labor-cost')).toBeInTheDocument();
  });

  it('nút Recalculate gọi lại API để tính lại', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('labor-cost-line-100');
    fireEvent.click(screen.getByTestId('btn-recalculate-labor-cost'));

    await waitFor(() => expect(profitabilityApi.getProjectLaborCost).toHaveBeenCalledTimes(2));
  });

  it('VT-01 thấy bảng chi tiết (có quyền xem nhân sự)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-01']} />);

    await screen.findByTestId('labor-cost-line-100');
    expect(screen.getByTestId('labor-cost-detail-table')).toBeInTheDocument();
    expect(screen.queryByTestId('table-hidden-notice')).not.toBeInTheDocument();
  });

  it('VT-02 (Project Manager) thấy Summary Card nhưng ẩn bảng chi tiết', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-02']} />);

    await screen.findByTestId('kpi-total-hours');
    expect(screen.getByTestId('kpi-total-cost')).toBeInTheDocument();
    expect(screen.getByTestId('table-hidden-notice')).toBeInTheDocument();
    expect(screen.queryByTestId('labor-cost-detail-table')).not.toBeInTheDocument();
  });

  it('VT-02 vẫn thấy Summary Card (approved hours, total cost)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-02']} />);

    await screen.findByTestId('kpi-total-hours');
    expect(screen.getByTestId('kpi-total-hours')).toHaveTextContent('14,50');
    expect(screen.getByTestId('kpi-lines-count')).toHaveTextContent('2');
  });

  it('VT-01 với quyền đồng thời VT-02 vẫn thấy bảng chi tiết (VT-01 ưu tiên)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getProjectLaborCost).mockResolvedValue(LABOR_COST_DATA);

    render(<ProjectLaborCostPage projectId={1} currentUserRoles={['VT-01', 'VT-02']} />);

    await screen.findByTestId('labor-cost-line-100');
    expect(screen.getByTestId('labor-cost-detail-table')).toBeInTheDocument();
    expect(screen.queryByTestId('table-hidden-notice')).not.toBeInTheDocument();
  });
});
