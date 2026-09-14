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
    closeProject: vi.fn(),
    getMilestones: vi.fn(),
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    completeMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
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
  status: 'CLOSED',
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
    // Mốc tiến độ (NCL-05-CN-008) được nạp cùng trang chi tiết — mặc định rỗng,
    // các test dưới đây không kiểm tra khối này nên không cần override riêng.
    vi.mocked(projectsApi.getMilestones).mockResolvedValue([]);
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
    // Đóng dự án button should not be present either (already closed)
    expect(screen.queryByTestId('btn-close-project')).not.toBeInTheDocument();
  });

  describe('Đóng dự án (NCL-05-CN-006)', () => {
    it('hides the "Đóng dự án" button for roles other than VT-02 (e.g. VT-03)', async () => {
      vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
      vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);

      render(<ProjectDetailPage projectId={1} currentUserRoles={['VT-03']} />);

      await waitFor(() => {
        expect(screen.getByText('PRJ-2026-001')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('btn-close-project')).not.toBeInTheDocument();
    });

    it('TC-01: closes a running project and reflects the new status after confirming', async () => {
      vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
      vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);
      vi.mocked(projectsApi.closeProject).mockResolvedValue(mockProjectClosed);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ProjectDetailPage projectId={1} currentUserRoles={['VT-02']} />);

      await waitFor(() => {
        expect(screen.getByText('PRJ-2026-001')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('btn-close-project'));

      await waitFor(() => {
        expect(projectsApi.closeProject).toHaveBeenCalledWith(1);
      });

      expect(confirmSpy).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByTestId('project-toast')).toHaveTextContent(/Đã đóng dự án thành công/i);
      });
      expect(screen.getByTestId('project-closed-alert')).toBeInTheDocument();
      expect(screen.queryByTestId('btn-close-project')).not.toBeInTheDocument();

      confirmSpy.mockRestore();
    });

    it('does nothing when the confirmation dialog is dismissed', async () => {
      vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
      vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<ProjectDetailPage projectId={1} currentUserRoles={['VT-02']} />);

      await waitFor(() => {
        expect(screen.getByText('PRJ-2026-001')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('btn-close-project'));

      expect(projectsApi.closeProject).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('TC-02: shows the pending-tasks message returned by the backend when closing is blocked', async () => {
      vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
      vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);
      vi.mocked(projectsApi.closeProject).mockRejectedValue(
        new projectsApi.ProjectsApiError(
          'INVALID_STATE',
          'Con cong viec dang cho duyet, chua the dong du an: #20 Kiem thu module A',
          400
        )
      );
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ProjectDetailPage projectId={1} currentUserRoles={['VT-02']} />);

      await waitFor(() => {
        expect(screen.getByText('PRJ-2026-001')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('btn-close-project'));

      await waitFor(() => {
        expect(screen.getByTestId('project-toast')).toHaveTextContent(/con cong viec dang cho duyet/i);
      });
      // Project stays open — the close button is still available for a retry.
      expect(screen.getByTestId('btn-close-project')).toBeInTheDocument();

      confirmSpy.mockRestore();
    });
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

  describe('Liên kết sang Rủi ro dự án (NCL-05-CN-009)', () => {
    it('hiển thị nút "Rủi ro dự án" cho VT-02 khi có onOpenRisks và gọi callback đúng projectId', async () => {
      vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
      vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);
      const onOpenRisks = vi.fn();

      render(<ProjectDetailPage projectId={1} currentUserRoles={['VT-02']} onOpenRisks={onOpenRisks} />);

      await waitFor(() => {
        expect(screen.getByText('PRJ-2026-001')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('btn-open-risks'));
      expect(onOpenRisks).toHaveBeenCalledWith(1);
    });

    it('ẩn nút "Rủi ro dự án" khi không truyền onOpenRisks hoặc vai trò không phải VT-02', async () => {
      vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
      vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);

      const { rerender } = render(<ProjectDetailPage projectId={1} currentUserRoles={['VT-02']} />);
      await waitFor(() => expect(screen.getByText('PRJ-2026-001')).toBeInTheDocument());
      expect(screen.queryByTestId('btn-open-risks')).not.toBeInTheDocument();

      rerender(<ProjectDetailPage projectId={1} currentUserRoles={['VT-03']} onOpenRisks={vi.fn()} />);
      await waitFor(() => expect(screen.getByText('PRJ-2026-001')).toBeInTheDocument());
      expect(screen.queryByTestId('btn-open-risks')).not.toBeInTheDocument();
    });
  });
});
