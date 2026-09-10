import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectDetailPage from '../pages/ProjectDetailPage';
import * as projectsApi from '../api/projectsApi';
import type { ProjectRes, WorkBreakdownRes } from '../types/projectTypes';

vi.mock('../api/projectsApi', () => {
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
    getWorkBreakdown: vi.fn(),
    createWorkPackage: vi.fn(),
    createTask: vi.fn(),
    deleteWorkPackage: vi.fn(),
    ProjectsApiError: MockProjectsApiError,
  };
});

const mockProjectRunning: ProjectRes = {
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

const mockProjectClosed: ProjectRes = {
  ...mockProjectRunning,
  status: 'COMPLETED',
};

const mockWbs: WorkBreakdownRes[] = [
  {
    id: 10,
    name: 'Khảo sát hiện trạng',
    description: 'Thu thập thông tin nghiệp vụ',
    parentId: null,
    children: [],
    tasks: [],
  },
];

describe('ProjectDetailPage Component (NCL-05-CN-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Access Denied message for unauthorized roles (e.g. VT-04, VT-05)', () => {
    render(
      <ProjectDetailPage
        projectId={1}
        currentUserRoles={['VT-05']}
      />
    );

    expect(screen.getByTestId('project-detail-forbidden')).toBeInTheDocument();
    expect(
      screen.getByText(/Bạn không có quyền xem thông tin dự án này/i)
    ).toBeInTheDocument();
  });

  it('loads and renders project overview and WBS tree for VT-02', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);

    render(
      <ProjectDetailPage
        projectId={1}
        currentUserRoles={['VT-02']}
      />
    );

    expect(screen.getByText(/Đang tải thông tin dự án & WBS…/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('PRJ-2026-001')).toBeInTheDocument();
    });

    expect(screen.getByText('Triển khai CRM cho Khách hàng Alpha')).toBeInTheDocument();
    expect(screen.getByText('Khảo sát hiện trạng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Thêm hạng mục gốc/i })).toBeInTheDocument();
  });

  it('shows warning alert and hides modification buttons when project is closed/completed', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectClosed);
    vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);

    render(
      <ProjectDetailPage
        projectId={1}
        currentUserRoles={['VT-02']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('PRJ-2026-001')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Dự án đã đóng hoặc tạm dừng/i)
    ).toBeInTheDocument();

    // + Thêm hạng mục gốc button should not be present
    expect(screen.queryByRole('button', { name: /\+ Thêm hạng mục gốc/i })).not.toBeInTheDocument();
  });

  it('opens WorkPackageModal when clicking + Thêm hạng mục gốc', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);

    render(
      <ProjectDetailPage
        projectId={1}
        currentUserRoles={['VT-02']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('PRJ-2026-001')).toBeInTheDocument();
    });

    const addRootBtn = screen.getByRole('button', { name: /\+ Thêm hạng mục gốc/i });
    fireEvent.click(addRootBtn);

    // WorkPackageModal should be visible with title "Thêm hạng mục gốc"
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Thêm hạng mục gốc')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tên hạng mục/i)).toBeInTheDocument();
  });

  it('displays error message when API fails to fetch project', async () => {
    vi.mocked(projectsApi.getProject).mockRejectedValue(
      new projectsApi.ProjectsApiError('NOT_FOUND', 'Không tìm thấy dự án', 404)
    );
    vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue([]);

    render(
      <ProjectDetailPage
        projectId={999}
        currentUserRoles={['VT-02']}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('project-load-error')).toBeInTheDocument();
    });

    expect(screen.getByText(/Không tìm thấy dự án/i)).toBeInTheDocument();
  });
});
