import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkBreakdownTree from '../components/WorkBreakdownTree';
import type { WorkBreakdownRes } from '../types/projectTypes';

const mockWbsData: WorkBreakdownRes[] = [
  {
    id: 101,
    name: 'Giai đoạn 1: Thiết kế',
    description: 'Thiết kế hệ thống và UI',
    parentId: null,
    children: [
      {
        id: 102,
        name: 'Thiết kế chi tiết Database',
        description: null,
        parentId: 101,
        children: [],
        tasks: [
          {
            id: 201,
            projectId: 1,
            workPackageId: 102,
            name: 'Viết file schema SQL',
            description: null,
            status: 'DONE',
            expectedStartDate: '2026-05-01',
            expectedEndDate: '2026-05-03',
            parentTaskId: null,
          },
        ],
      },
    ],
    tasks: [
      {
        id: 202,
        projectId: 1,
        workPackageId: 101,
        name: 'Thiết kế giao diện Figma',
        description: 'Vẽ mockup WBS',
        status: 'IN_PROGRESS',
        expectedStartDate: '2026-05-04',
        expectedEndDate: '2026-05-10',
        parentTaskId: null,
      },
      {
        id: 203,
        projectId: 1,
        workPackageId: 101,
        name: 'Vẽ component tree',
        description: null,
        status: 'TODO',
        expectedStartDate: '2026-05-05',
        expectedEndDate: '2026-05-06',
        parentTaskId: 202,
      },
    ],
  },
  {
    id: 103,
    name: 'Giai đoạn 3: Nghiệm thu',
    description: null,
    parentId: null,
    children: [],
    tasks: [],
  },
];

describe('WorkBreakdownTree Component (NCL-05-CN-002)', () => {
  it('renders tree with root packages, subpackages, tasks and subtasks', () => {
    render(
      <WorkBreakdownTree
        projectId={1}
        items={mockWbsData}
        canEdit={true}
        isProjectOpen={true}
      />
    );

    expect(screen.getByText('Giai đoạn 1: Thiết kế')).toBeInTheDocument();
    expect(screen.getByText('Thiết kế hệ thống và UI')).toBeInTheDocument();
    expect(screen.getByText('Thiết kế chi tiết Database')).toBeInTheDocument();
    expect(screen.getByText('Viết file schema SQL')).toBeInTheDocument();
    expect(screen.getByText('Thiết kế giao diện Figma')).toBeInTheDocument();
    expect(screen.getByText('Vẽ component tree')).toBeInTheDocument();
    expect(screen.getByText('Hoàn thành')).toBeInTheDocument(); // status badge
    expect(screen.getByText('Đang làm')).toBeInTheDocument(); // status badge
    expect(screen.getByText('Chờ thực hiện')).toBeInTheDocument(); // status badge
  });

  it('renders empty state when there are no work packages', () => {
    render(
      <WorkBreakdownTree
        projectId={1}
        items={[]}
        canEdit={true}
        isProjectOpen={true}
      />
    );

    expect(
      screen.getByText(/Chưa có hạng mục công việc nào/i)
    ).toBeInTheDocument();
  });

  it('shows action buttons (+ Thêm việc, + Mục con, Xóa) when canEdit=true and isProjectOpen=true', () => {
    const onAddTask = vi.fn();
    const onAddSubPackage = vi.fn();
    const onDeletePackage = vi.fn();

    render(
      <WorkBreakdownTree
        projectId={1}
        items={mockWbsData}
        canEdit={true}
        isProjectOpen={true}
        onAddTask={onAddTask}
        onAddSubPackage={onAddSubPackage}
        onDeletePackage={onDeletePackage}
      />
    );

    // Thao tác hạng mục nay gộp trong menu kebab (⋮) — mở đúng menu của hạng mục
    // muốn thao tác rồi bấm vào mục con bên trong theo data-testid ổn định.
    fireEvent.click(screen.getByLabelText('Thao tác hạng mục Giai đoạn 1: Thiết kế'));
    fireEvent.click(screen.getByTestId('add-task-btn-101'));
    expect(onAddTask).toHaveBeenCalledWith(mockWbsData[0], null);

    fireEvent.click(screen.getByLabelText('Thao tác hạng mục Giai đoạn 1: Thiết kế'));
    fireEvent.click(screen.getByTestId('add-subpackage-btn-101'));
    expect(onAddSubPackage).toHaveBeenCalledWith(mockWbsData[0]);

    // Xóa chỉ hiển thị với hạng mục rỗng không có task và không có mục con (hạng mục 103)
    fireEvent.click(screen.getByLabelText('Thao tác hạng mục Giai đoạn 3: Nghiệm thu'));
    fireEvent.click(screen.getByTestId('delete-wp-btn-103'));
    expect(onDeletePackage).toHaveBeenCalledWith(mockWbsData[1]);
  });

  it('hides modification buttons when canEdit is false (read-only mode for VT-01, VT-03)', () => {
    render(
      <WorkBreakdownTree
        projectId={1}
        items={mockWbsData}
        canEdit={false}
        isProjectOpen={true}
      />
    );

    expect(screen.queryByLabelText(/Thao tác hạng mục/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Thao tác công việc/i)).not.toBeInTheDocument();
  });

  it('hides modification buttons when isProjectOpen is false (closed project)', () => {
    render(
      <WorkBreakdownTree
        projectId={1}
        items={mockWbsData}
        canEdit={true}
        isProjectOpen={false}
      />
    );

    expect(screen.queryByLabelText(/Thao tác hạng mục/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Thao tác công việc/i)).not.toBeInTheDocument();
  });

  it('calls onAddTask when clicking "Thêm việc con" on a task (thao tác nay gom trong menu kebab)', () => {
    const onAddTask = vi.fn();

    render(
      <WorkBreakdownTree
        projectId={1}
        items={mockWbsData}
        canEdit={true}
        isProjectOpen={true}
        onAddTask={onAddTask}
      />
    );

    const taskMenuButtons = screen.getAllByLabelText(/Thao tác công việc/i);
    expect(taskMenuButtons.length).toBeGreaterThan(0);
    fireEvent.click(taskMenuButtons[0]);
    fireEvent.click(screen.getByText('Thêm việc con'));
    expect(onAddTask).toHaveBeenCalled();
  });

  it('collapses and expands work package when toggling chevron', () => {
    render(
      <WorkBreakdownTree
        projectId={1}
        items={mockWbsData}
        canEdit={true}
        isProjectOpen={true}
      />
    );

    // Initial: task is visible
    expect(screen.getByText('Thiết kế giao diện Figma')).toBeInTheDocument();

    // Find collapse button for root package
    const collapseBtns = screen.getAllByRole('button', { name: /Thu gọn hạng mục/i });
    fireEvent.click(collapseBtns[0]);

    // After collapse: tasks inside root package are hidden
    expect(screen.queryByText('Thiết kế giao diện Figma')).not.toBeInTheDocument();

    // Click again to expand
    const expandBtns = screen.getAllByRole('button', { name: /Mở rộng hạng mục/i });
    fireEvent.click(expandBtns[0]);

    expect(screen.getByText('Thiết kế giao diện Figma')).toBeInTheDocument();
  });
});
