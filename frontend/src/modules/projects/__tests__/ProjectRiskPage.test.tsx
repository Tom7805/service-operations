import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectRiskPage from '../pages/ProjectRiskPage';
import * as projectsApi from '../api/projectsApi';
import type { ProjectRes, ProjectRiskRes } from '../types/projectTypes';

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
    getRisks: vi.fn(),
    createRisk: vi.fn(),
    updateRisk: vi.fn(),
    changeRiskStatus: vi.fn(),
    deleteRisk: vi.fn(),
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

const mockProjectClosed: ProjectRes = { ...mockProjectRunning, status: 'CLOSED' };

const riskHigh: ProjectRiskRes = {
  id: 31,
  projectId: 1,
  description: 'Nhà thầu phụ có nguy cơ chậm tiến độ tích hợp',
  impact: 'HIGH',
  likelihood: 'MEDIUM',
  score: 6,
  severity: 'HIGH',
  status: 'OPEN',
  mitigation: 'Chuẩn bị nhà thầu dự phòng',
  watcherId: 7,
  watcherName: 'Nguyễn Văn A',
  createdBy: 'pm01',
  createdAt: '2026-09-10T10:00:00',
  updatedAt: '2026-09-10T10:00:00',
};

const riskLow: ProjectRiskRes = {
  id: 32,
  projectId: 1,
  description: 'Thiếu nhân sự backup',
  impact: 'LOW',
  likelihood: 'LOW',
  score: 1,
  severity: 'LOW',
  status: 'CLOSED',
  mitigation: null,
  watcherId: 8,
  watcherName: null,
  createdBy: 'pm01',
  createdAt: '2026-09-05T10:00:00',
  updatedAt: '2026-09-05T10:00:00',
};

describe('ProjectRiskPage (NCL-05-CN-009 — Quản lý rủi ro dự án)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-03: hiển thị Access Denied cho vai trò khác VT-02 (ví dụ VT-01, VT-03)', () => {
    render(<ProjectRiskPage projectId={1} currentUserRoles={['VT-03']} />);

    expect(screen.getByTestId('project-risk-forbidden')).toBeInTheDocument();
    expect(screen.getByText(/Bạn không có quyền xem rủi ro của dự án này/i)).toBeInTheDocument();
    expect(projectsApi.getRisks).not.toHaveBeenCalled();
  });

  it('TC-02: tải và hiển thị bảng theo dõi rủi ro với điểm/mức độ đúng', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getRisks).mockResolvedValue([riskHigh, riskLow]);

    render(<ProjectRiskPage projectId={1} currentUserRoles={['VT-02']} />);

    await waitFor(() => {
      expect(screen.getByText('Nhà thầu phụ có nguy cơ chậm tiến độ tích hợp')).toBeInTheDocument();
    });

    expect(screen.getByTestId('risk-severity-31')).toHaveTextContent('6');
    expect(screen.getByTestId('risk-severity-31')).toHaveTextContent('Cao');
    expect(screen.getByTestId('risk-severity-32')).toHaveTextContent('1');
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('#8')).toBeInTheDocument();
  });

  it('hiển thị trạng thái rỗng khi dự án chưa có rủi ro nào', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getRisks).mockResolvedValue([]);

    render(<ProjectRiskPage projectId={1} currentUserRoles={['VT-02']} />);

    await waitFor(() => {
      expect(screen.getByTestId('risk-empty')).toBeInTheDocument();
    });
  });

  it('ẩn toàn bộ thao tác và hiện cảnh báo khi dự án đã đóng', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectClosed);
    vi.mocked(projectsApi.getRisks).mockResolvedValue([riskHigh]);

    render(<ProjectRiskPage projectId={1} currentUserRoles={['VT-02']} />);

    await waitFor(() => {
      expect(screen.getByTestId('risk-project-closed-alert')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('btn-add-risk')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-edit-risk-31')).not.toBeInTheDocument();
    // Không cho đổi trạng thái nữa — hiển thị pill tĩnh thay vì <select>.
    expect(screen.queryByTestId('risk-status-select-31')).not.toBeInTheDocument();
    expect(screen.getByTestId('risk-status-31')).toHaveTextContent('Chưa xử lý');
  });

  it('TC-01: mở form, điền dữ liệu và ghi nhận rủi ro mới thành công', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getRisks).mockResolvedValue([]);
    vi.mocked(projectsApi.createRisk).mockResolvedValue(riskHigh);

    render(<ProjectRiskPage projectId={1} currentUserRoles={['VT-02']} currentUserId={9} />);

    await waitFor(() => {
      expect(screen.getByTestId('risk-empty')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-add-risk'));
    expect(screen.getByRole('heading', { name: 'Ghi nhận rủi ro' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Mô tả rủi ro/i), {
      target: { value: 'Nhà thầu phụ có nguy cơ chậm tiến độ tích hợp' },
    });
    fireEvent.change(screen.getByLabelText(/Mức tác động/i), { target: { value: 'HIGH' } });
    fireEvent.change(screen.getByLabelText(/Khả năng xảy ra/i), { target: { value: 'MEDIUM' } });
    fireEvent.change(screen.getByLabelText(/Người theo dõi/i), { target: { value: '7' } });

    fireEvent.click(screen.getByTestId('submit-risk-btn'));

    await waitFor(() => {
      expect(projectsApi.createRisk).toHaveBeenCalledWith(1, {
        description: 'Nhà thầu phụ có nguy cơ chậm tiến độ tích hợp',
        impact: 'HIGH',
        likelihood: 'MEDIUM',
        mitigation: null,
        watcherId: 7,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('risk-toast')).toHaveTextContent('Đã ghi nhận rủi ro thành công');
    });
  });

  it('nút "Theo dõi bởi tôi" điền id tài khoản đang đăng nhập vào người theo dõi', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getRisks).mockResolvedValue([]);

    render(<ProjectRiskPage projectId={1} currentUserRoles={['VT-02']} currentUserId={9} />);
    await waitFor(() => expect(screen.getByTestId('risk-empty')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-add-risk'));
    fireEvent.click(screen.getByText('Theo dõi bởi tôi'));

    expect((screen.getByLabelText(/Người theo dõi/i) as HTMLInputElement).value).toBe('9');
  });

  it('báo lỗi validate khi thiếu trường bắt buộc, không gọi API', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getRisks).mockResolvedValue([]);

    render(<ProjectRiskPage projectId={1} currentUserRoles={['VT-02']} />);
    await waitFor(() => expect(screen.getByTestId('risk-empty')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-add-risk'));
    fireEvent.click(screen.getByTestId('submit-risk-btn'));

    expect(await screen.findByTestId('error-risk-description')).toHaveTextContent(
      'Mô tả rủi ro không được để trống'
    );
    expect(screen.getByTestId('error-risk-impact')).toBeInTheDocument();
    expect(screen.getByTestId('error-risk-likelihood')).toBeInTheDocument();
    expect(screen.getByTestId('error-risk-watcher-id')).toBeInTheDocument();
    expect(projectsApi.createRisk).not.toHaveBeenCalled();
  });

  it('mở form Sửa với dữ liệu điền sẵn và gọi updateRisk khi lưu', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getRisks).mockResolvedValue([riskHigh]);
    vi.mocked(projectsApi.updateRisk).mockResolvedValue({ ...riskHigh, description: 'Mô tả đã sửa' });

    render(<ProjectRiskPage projectId={1} currentUserRoles={['VT-02']} />);
    await waitFor(() => {
      expect(screen.getByText('Nhà thầu phụ có nguy cơ chậm tiến độ tích hợp')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-edit-risk-31'));

    const descInput = screen.getByLabelText(/Mô tả rủi ro/i) as HTMLTextAreaElement;
    expect(descInput.value).toBe('Nhà thầu phụ có nguy cơ chậm tiến độ tích hợp');
    expect((screen.getByLabelText(/Người theo dõi/i) as HTMLInputElement).value).toBe('7');

    fireEvent.change(descInput, { target: { value: 'Mô tả đã sửa' } });
    fireEvent.click(screen.getByTestId('submit-risk-btn'));

    await waitFor(() => {
      expect(projectsApi.updateRisk).toHaveBeenCalledWith(1, 31, {
        description: 'Mô tả đã sửa',
        impact: 'HIGH',
        likelihood: 'MEDIUM',
        mitigation: 'Chuẩn bị nhà thầu dự phòng',
        watcherId: 7,
      });
    });
  });

  it('đổi trạng thái rủi ro qua select và gọi changeRiskStatus', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getRisks).mockResolvedValue([riskHigh]);
    vi.mocked(projectsApi.changeRiskStatus).mockResolvedValue({ ...riskHigh, status: 'MITIGATING' });

    render(<ProjectRiskPage projectId={1} currentUserRoles={['VT-02']} />);
    await waitFor(() => {
      expect(screen.getByTestId('risk-status-select-31')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('risk-status-select-31'), { target: { value: 'MITIGATING' } });

    await waitFor(() => {
      expect(projectsApi.changeRiskStatus).toHaveBeenCalledWith(1, 31, { status: 'MITIGATING' });
    });
  });

  it('xóa rủi ro khi xác nhận, không gọi API khi hủy xác nhận', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(projectsApi.getRisks).mockResolvedValue([riskHigh]);
    vi.mocked(projectsApi.deleteRisk).mockResolvedValue();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ProjectRiskPage projectId={1} currentUserRoles={['VT-02']} />);
    await waitFor(() => {
      expect(screen.getByTestId('btn-delete-risk-31')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-delete-risk-31'));
    expect(projectsApi.deleteRisk).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByTestId('btn-delete-risk-31'));

    await waitFor(() => {
      expect(projectsApi.deleteRisk).toHaveBeenCalledWith(1, 31);
    });

    confirmSpy.mockRestore();
  });

  it('hiển thị lỗi khi tải dữ liệu thất bại', async () => {
    vi.mocked(projectsApi.getProject).mockRejectedValue(
      new projectsApi.ProjectsApiError('RESOURCE_NOT_FOUND', 'Không tìm thấy dự án', 404)
    );
    vi.mocked(projectsApi.getRisks).mockResolvedValue([]);

    render(<ProjectRiskPage projectId={999} currentUserRoles={['VT-02']} />);

    await waitFor(() => {
      expect(screen.getByTestId('risk-load-error')).toHaveTextContent('Không tìm thấy dự án');
    });
  });
});
