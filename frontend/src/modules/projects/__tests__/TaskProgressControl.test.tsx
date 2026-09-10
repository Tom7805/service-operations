import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TaskProgressControl from '../components/TaskProgressControl';
import * as tasksApi from '../api/tasksApi';
import type { TaskRes } from '../types/taskTypes';

vi.mock('../api/tasksApi', () => ({
  updateTaskProgress: vi.fn(),
  TaskApiError: class extends Error {
    constructor(
      public code: string,
      message: string,
      public statusCode?: number,
      public fieldErrors?: Array<{ field: string; message: string }>
    ) {
      super(message);
      this.name = 'TaskApiError';
    }
  },
}));

const task: TaskRes = {
  id: 20,
  projectId: 1,
  workPackageId: 10,
  parentTaskId: null,
  name: 'Phỏng vấn người dùng',
  description: 'Ghi nhận quy trình hiện tại',
  expectedStartDate: '2026-09-10',
  expectedEndDate: '2026-09-12',
  status: 'IN_PROGRESS',
};

describe('TaskProgressControl (NCL-05-CN-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-01: cập nhật trạng thái thành công và hiển thị thông báo thành công', async () => {
    const onUpdated = vi.fn();
    const updatedTask: TaskRes = { ...task, status: 'DONE' };
    vi.mocked(tasksApi.updateTaskProgress).mockResolvedValue(updatedTask);

    render(
      <TaskProgressControl
        projectId={1}
        task={task}
        currentUserRoles={['VT-03']}
        onTaskUpdated={onUpdated}
      />
    );

    fireEvent.change(screen.getByLabelText(/trạng thái công việc/i), {
      target: { value: 'DONE' },
    });

    await waitFor(() => {
      expect(tasksApi.updateTaskProgress).toHaveBeenCalledWith(1, 20, 'DONE');
      expect(onUpdated).toHaveBeenCalledWith(updatedTask);
      expect(screen.getByText(/Đã cập nhật trạng thái công việc/i)).toBeInTheDocument();
    });
  });

  it('TC-02: hiển thị thông báo khi người dùng không phải người phụ trách', async () => {
    const error = new tasksApi.TaskApiError('FORBIDDEN', 'Bạn không phải người phụ trách công việc này', 403);
    vi.mocked(tasksApi.updateTaskProgress).mockRejectedValue(error);

    render(<TaskProgressControl projectId={1} task={task} currentUserRoles={['VT-03']} />);

    fireEvent.change(screen.getByLabelText(/trạng thái công việc/i), {
      target: { value: 'DONE' },
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Bạn không phải người phụ trách công việc này/i);
    });
  });

  it('TC-03: chặn thao tác khi người dùng không có vai trò VT-03', () => {
    render(<TaskProgressControl projectId={1} task={task} currentUserRoles={['VT-02']} />);

    expect(screen.getByText(/Chỉ nhân viên chuyên môn được giao việc mới được cập nhật/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/trạng thái công việc/i)).toBeDisabled();
  });
});
