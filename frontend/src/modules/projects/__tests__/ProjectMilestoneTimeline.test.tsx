import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectMilestoneTimeline from '../components/ProjectMilestoneTimeline';
import * as projectsApi from '../api/projectsApi';
import type { ProjectMilestoneRes, WorkBreakdownRes } from '../types/projectTypes';

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
    getMilestones: vi.fn(),
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    completeMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
    ProjectsApiError: MockProjectsApiError,
  };
});

const wbsFixture: WorkBreakdownRes[] = [
  {
    id: 101,
    parentId: null,
    name: 'Giai đoạn 1: Thiết kế',
    description: null,
    children: [],
    tasks: [
      {
        id: 11,
        projectId: 1,
        workPackageId: 101,
        parentTaskId: null,
        name: 'Thiết lập môi trường',
        description: null,
        expectedStartDate: null,
        expectedEndDate: null,
        status: 'TODO',
      },
      {
        id: 12,
        projectId: 1,
        workPackageId: 101,
        parentTaskId: null,
        name: 'Viết schema SQL',
        description: null,
        expectedStartDate: null,
        expectedEndDate: null,
        status: 'DONE',
      },
    ],
  },
];

const emptyWbsFixture: WorkBreakdownRes[] = [
  { id: 101, parentId: null, name: 'Giai đoạn rỗng', description: null, children: [], tasks: [] },
];

const milestoneOnTrack: ProjectMilestoneRes = {
  id: 21,
  projectId: 1,
  name: 'Bàn giao giai đoạn một',
  description: 'Chữ ký nghiệm thu giai đoạn 1',
  plannedDate: '2027-10-01',
  actualDate: null,
  status: 'ON_TRACK',
  daysLate: null,
  items: [{ taskId: 11, taskName: 'Thiết lập môi trường', taskStatus: 'TODO' }],
};

const milestoneLate: ProjectMilestoneRes = {
  id: 22,
  projectId: 1,
  name: 'Nghiệm thu giai đoạn hai',
  description: null,
  plannedDate: '2027-01-01',
  actualDate: null,
  status: 'LATE',
  daysLate: 15,
  items: [{ taskId: 12, taskName: 'Viết schema SQL', taskStatus: 'DONE' }],
};

const milestoneDone: ProjectMilestoneRes = {
  id: 23,
  projectId: 1,
  name: 'Khởi tạo dự án',
  description: null,
  plannedDate: '2027-05-01',
  actualDate: '2027-04-28',
  status: 'DONE',
  daysLate: null,
  items: [{ taskId: 11, taskName: 'Thiết lập môi trường', taskStatus: 'TODO' }],
};

describe('ProjectMilestoneTimeline (NCL-05-CN-008 — Quản lý mốc tiến độ của dự án)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-02: hiển thị bảng theo dõi tiến độ với đúng trạng thái DONE/ON_TRACK/LATE và số ngày trễ', async () => {
    vi.mocked(projectsApi.getMilestones).mockResolvedValue([milestoneOnTrack, milestoneLate, milestoneDone]);

    render(<ProjectMilestoneTimeline projectId={1} wbs={wbsFixture} canEdit={true} isProjectOpen={true} />);

    expect(screen.getByTestId('milestone-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Bàn giao giai đoạn một')).toBeInTheDocument();
    });

    expect(screen.getByTestId('milestone-status-21')).toHaveTextContent('Đúng tiến độ');
    expect(screen.getByTestId('milestone-status-22')).toHaveTextContent('Trễ tiến độ');
    expect(screen.getByTestId('milestone-status-22')).toHaveTextContent('15 ngày');
    expect(screen.getByTestId('milestone-status-23')).toHaveTextContent('Đã hoàn thành');
  });

  it('hiển thị trạng thái rỗng khi dự án chưa có mốc tiến độ nào', async () => {
    vi.mocked(projectsApi.getMilestones).mockResolvedValue([]);

    render(<ProjectMilestoneTimeline projectId={1} wbs={wbsFixture} canEdit={true} isProjectOpen={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('milestone-empty')).toBeInTheDocument();
    });
  });

  it('TC-03: ẩn nút thêm/sửa/xóa khi người dùng không phải Quản lý dự án (canEdit=false)', async () => {
    vi.mocked(projectsApi.getMilestones).mockResolvedValue([milestoneOnTrack]);

    render(<ProjectMilestoneTimeline projectId={1} wbs={wbsFixture} canEdit={false} isProjectOpen={true} />);

    await waitFor(() => {
      expect(screen.getByText('Bàn giao giai đoạn một')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('btn-add-milestone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-edit-milestone-21')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-delete-milestone-21')).not.toBeInTheDocument();
  });

  it('vô hiệu hóa nút "+ Thêm mốc tiến độ" khi dự án chưa có công việc nào trong cây công việc', async () => {
    vi.mocked(projectsApi.getMilestones).mockResolvedValue([]);

    render(<ProjectMilestoneTimeline projectId={1} wbs={emptyWbsFixture} canEdit={true} isProjectOpen={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('milestone-empty')).toBeInTheDocument();
    });

    expect(screen.getByTestId('btn-add-milestone')).toBeDisabled();
    expect(screen.getByTestId('milestone-no-wbs-hint')).toBeInTheDocument();
  });

  it('hiển thị cảnh báo và ẩn toàn bộ thao tác khi dự án đã đóng', async () => {
    vi.mocked(projectsApi.getMilestones).mockResolvedValue([milestoneOnTrack]);

    render(<ProjectMilestoneTimeline projectId={1} wbs={wbsFixture} canEdit={true} isProjectOpen={false} />);

    await waitFor(() => {
      expect(screen.getByText('Bàn giao giai đoạn một')).toBeInTheDocument();
    });

    expect(screen.getByText(/Dự án đã đóng — không thể thêm, sửa hoặc xóa mốc tiến độ/i)).toBeInTheDocument();
    expect(screen.queryByTestId('btn-add-milestone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-edit-milestone-21')).not.toBeInTheDocument();
  });

  it('TC-01: mở form, chọn hạng mục và tạo mốc tiến độ mới thành công', async () => {
    vi.mocked(projectsApi.getMilestones).mockResolvedValue([]);
    vi.mocked(projectsApi.createMilestone).mockResolvedValue(milestoneOnTrack);
    const onNotify = vi.fn();

    render(
      <ProjectMilestoneTimeline
        projectId={1}
        wbs={wbsFixture}
        canEdit={true}
        isProjectOpen={true}
        onNotify={onNotify}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('milestone-empty')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-add-milestone'));
    expect(screen.getByRole('heading', { name: 'Thêm mốc tiến độ' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Tên mốc tiến độ/i), {
      target: { value: 'Bàn giao giai đoạn một' },
    });
    fireEvent.change(screen.getByLabelText(/Ngày kế hoạch/i), { target: { value: '2027-10-01' } });
    fireEvent.click(screen.getByTestId('milestone-task-option-11'));

    fireEvent.click(screen.getByTestId('submit-milestone-btn'));

    await waitFor(() => {
      expect(projectsApi.createMilestone).toHaveBeenCalledWith(1, {
        name: 'Bàn giao giai đoạn một',
        description: null,
        plannedDate: '2027-10-01',
        taskIds: [11],
      });
    });

    await waitFor(() => {
      expect(onNotify).toHaveBeenCalledWith(expect.stringContaining('Đã thêm mốc tiến độ'), 'success');
    });
    // Đóng modal và nạp lại danh sách sau khi lưu thành công.
    expect(projectsApi.getMilestones).toHaveBeenCalledTimes(2);
  });

  it('báo lỗi và không gọi API khi chưa chọn hạng mục phải hoàn thành nào', async () => {
    vi.mocked(projectsApi.getMilestones).mockResolvedValue([]);

    render(<ProjectMilestoneTimeline projectId={1} wbs={wbsFixture} canEdit={true} isProjectOpen={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('milestone-empty')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-add-milestone'));
    fireEvent.change(screen.getByLabelText(/Tên mốc tiến độ/i), { target: { value: 'Mốc chưa chọn việc' } });
    fireEvent.change(screen.getByLabelText(/Ngày kế hoạch/i), { target: { value: '2027-10-01' } });
    fireEvent.click(screen.getByTestId('submit-milestone-btn'));

    expect(await screen.findByTestId('error-milestone-task-ids')).toHaveTextContent(
      'Phải chọn ít nhất một hạng mục phải hoàn thành'
    );
    expect(projectsApi.createMilestone).not.toHaveBeenCalled();
  });

  it('mở form Sửa với dữ liệu điền sẵn và gọi updateMilestone khi lưu', async () => {
    vi.mocked(projectsApi.getMilestones).mockResolvedValue([milestoneOnTrack]);
    vi.mocked(projectsApi.updateMilestone).mockResolvedValue({ ...milestoneOnTrack, name: 'Tên đã sửa' });

    render(<ProjectMilestoneTimeline projectId={1} wbs={wbsFixture} canEdit={true} isProjectOpen={true} />);

    await waitFor(() => {
      expect(screen.getByText('Bàn giao giai đoạn một')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-edit-milestone-21'));

    const nameInput = screen.getByLabelText(/Tên mốc tiến độ/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Bàn giao giai đoạn một');
    // Hạng mục đã gắn trước đó phải được chọn sẵn.
    expect(screen.getByTestId('milestone-task-option-11')).toHaveClass('checklist-item--checked');

    fireEvent.change(nameInput, { target: { value: 'Tên đã sửa' } });
    fireEvent.click(screen.getByTestId('submit-milestone-btn'));

    await waitFor(() => {
      expect(projectsApi.updateMilestone).toHaveBeenCalledWith(1, 21, {
        name: 'Tên đã sửa',
        description: 'Chữ ký nghiệm thu giai đoạn 1',
        plannedDate: '2027-10-01',
        taskIds: [11],
      });
    });
  });

  it('chỉ hiện nút "Hoàn thành" cho mốc chưa DONE, và ghi nhận ngày thực tế qua modal', async () => {
    vi.mocked(projectsApi.getMilestones).mockResolvedValue([milestoneOnTrack, milestoneDone]);
    vi.mocked(projectsApi.completeMilestone).mockResolvedValue({
      ...milestoneOnTrack,
      status: 'DONE',
      actualDate: '2027-09-20',
    });

    render(<ProjectMilestoneTimeline projectId={1} wbs={wbsFixture} canEdit={true} isProjectOpen={true} />);

    await waitFor(() => {
      expect(screen.getByText('Bàn giao giai đoạn một')).toBeInTheDocument();
    });

    expect(screen.getByTestId('btn-complete-milestone-21')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-complete-milestone-23')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-complete-milestone-21'));
    expect(screen.getByTestId('milestone-complete-form')).toBeInTheDocument();

    // Ngày cố định trong quá khứ để không bao giờ bị validator "không được ở tương lai" chặn.
    fireEvent.change(screen.getByLabelText(/Ngày thực tế hoàn thành/i), { target: { value: '2020-01-15' } });
    fireEvent.click(screen.getByTestId('submit-milestone-complete-btn'));

    await waitFor(() => {
      expect(projectsApi.completeMilestone).toHaveBeenCalledWith(1, 21, { actualDate: '2020-01-15' });
    });
  });

  it('xóa mốc tiến độ khi xác nhận, không gọi API khi hủy xác nhận', async () => {
    vi.mocked(projectsApi.getMilestones).mockResolvedValue([milestoneOnTrack]);
    vi.mocked(projectsApi.deleteMilestone).mockResolvedValue();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ProjectMilestoneTimeline projectId={1} wbs={wbsFixture} canEdit={true} isProjectOpen={true} />);

    await waitFor(() => {
      expect(screen.getByText('Bàn giao giai đoạn một')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-delete-milestone-21'));
    expect(projectsApi.deleteMilestone).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByTestId('btn-delete-milestone-21'));

    await waitFor(() => {
      expect(projectsApi.deleteMilestone).toHaveBeenCalledWith(1, 21);
    });

    confirmSpy.mockRestore();
  });

  it('hiển thị thông báo lỗi khi tải danh sách mốc tiến độ thất bại', async () => {
    vi.mocked(projectsApi.getMilestones).mockRejectedValue(
      new projectsApi.ProjectsApiError('RESOURCE_NOT_FOUND', 'Không tìm thấy dự án', 404)
    );

    render(<ProjectMilestoneTimeline projectId={999} wbs={wbsFixture} canEdit={true} isProjectOpen={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('milestone-load-error')).toHaveTextContent('Không tìm thấy dự án');
    });
  });
});
