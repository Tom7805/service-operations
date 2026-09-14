import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectWbsModal from '../components/ProjectWbsModal';
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

const mockWbs: WorkBreakdownRes[] = [];

describe('ProjectWbsModal Component — Đóng dự án (NCL-05-CN-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render anything when isOpen is false', () => {
    render(
      <ProjectWbsModal isOpen={false} onClose={vi.fn()} projectId={1} currentUserRoles={['VT-02']} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides the "Đóng dự án" button for roles other than VT-02', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);

    render(
      <ProjectWbsModal isOpen onClose={vi.fn()} projectId={1} currentUserRoles={['VT-03']} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('wbs-tab-wbs')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('modal-btn-close-project')).not.toBeInTheDocument();
  });

  it('hides the "Đóng dự án" button when the project is already closed', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectClosed);
    vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);

    render(
      <ProjectWbsModal isOpen onClose={vi.fn()} projectId={1} currentUserRoles={['VT-02']} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('wbs-closed-alert')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('modal-btn-close-project')).not.toBeInTheDocument();
  });

  it('TC-01: closes a running project, refreshes the status and notifies the parent via onUpdated', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);
    vi.mocked(projectsApi.closeProject).mockResolvedValue(mockProjectClosed);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onUpdated = vi.fn();

    render(
      <ProjectWbsModal
        isOpen
        onClose={vi.fn()}
        projectId={1}
        currentUserRoles={['VT-02']}
        onUpdated={onUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('modal-btn-close-project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('modal-btn-close-project'));

    await waitFor(() => {
      expect(projectsApi.closeProject).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(screen.getByText(/Đã đóng dự án thành công/i)).toBeInTheDocument();
    });

    expect(onUpdated).toHaveBeenCalled();
    expect(screen.getByTestId('wbs-closed-alert')).toBeInTheDocument();
    expect(screen.queryByTestId('modal-btn-close-project')).not.toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('does nothing when the confirmation dialog is dismissed', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<ProjectWbsModal isOpen onClose={vi.fn()} projectId={1} currentUserRoles={['VT-02']} />);

    await waitFor(() => {
      expect(screen.getByTestId('modal-btn-close-project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('modal-btn-close-project'));

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

    render(<ProjectWbsModal isOpen onClose={vi.fn()} projectId={1} currentUserRoles={['VT-02']} />);

    await waitFor(() => {
      expect(screen.getByTestId('modal-btn-close-project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('modal-btn-close-project'));

    await waitFor(() => {
      expect(screen.getByText(/Con cong viec dang cho duyet/i)).toBeInTheDocument();
    });
    // Project stays open — the close button is still available for a retry.
    expect(screen.getByTestId('modal-btn-close-project')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });
});
