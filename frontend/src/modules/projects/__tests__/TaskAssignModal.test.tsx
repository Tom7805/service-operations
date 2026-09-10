import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskAssignModal from '../components/TaskAssignModal';

describe('TaskAssignModal', () => {
  it('cho phép chọn nhiều nhân sự và gửi payload đúng format theo API contract', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <TaskAssignModal
        isOpen={true}
        projectId={12}
        task={{
          id: 20,
          projectId: 12,
          workPackageId: 5,
          parentTaskId: null,
          name: 'Xây dựng API dự án',
          description: 'Phát triển backend cho module dự án',
          expectedStartDate: '2026-09-10',
          expectedEndDate: '2026-09-15',
          status: 'TODO',
        }}
        assignments={[]}
        staffList={[
          { id: 101, username: 'dev01', fullName: 'Dev One', hasEmployeeProfile: true },
          { id: 102, username: 'dev02', fullName: 'Dev Two', hasEmployeeProfile: true },
          { id: 103, username: 'pm01', fullName: 'PM One', hasEmployeeProfile: true },
        ]}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText('Giao việc cho nhân sự')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dev One'));
    fireEvent.click(screen.getByLabelText('Dev Two'));

    fireEvent.change(screen.getByLabelText('Ngày bắt đầu mong muốn'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('Ngày kết thúc mong muốn'), { target: { value: '2026-09-12' } });

    fireEvent.click(screen.getByRole('button', { name: /Lưu phân công/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        userIds: [101, 102],
        expectedStartDate: '2026-09-10',
        expectedEndDate: '2026-09-12',
      });
    });
  });
});
