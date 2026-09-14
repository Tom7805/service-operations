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

    const addTaskButtons = screen.getAllByRole('button', { name: /\+ Thêm việc/i });
    expect(addTaskButtons.length).toBeGreaterThan(0);
    fireEvent.click(addTaskButtons[0]);
    expect(onAddTask).toHaveBeenCalledWith(mockWbsData[0], null);

    const addSubPkgButtons = screen.getAllByRole('button', { name: /\+ Mục con/i });
    expect(addSubPkgButtons.length).toBeGreaterThan(0);
    fireEvent.click(addSubPkgButtons[0]);
    expect(onAddSubPackage).toHaveBeenCalledWith(mockWbsData[0]);

    // Xóa chỉ hiển thị với hạng mục rỗng không có task và không có mục con (hạng mục 103)
    const deleteButtons = screen.getAllByRole('button', { name: /Xóa/i });
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);
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

    expect(screen.queryByRole('button', { name: /\+ Thêm việc/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+ Mục con/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xóa/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+ Việc con/i })).not.toBeInTheDocument();
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

    expect(screen.queryByRole('button', { name: /\+ Thêm việc/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+ Mục con/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xóa/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+ Việc con/i })).not.toBeInTheDocument();
  });

  it('calls onAddTask when clicking + Việc con on a task', () => {
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

    const addSubTaskButtons = screen.getAllByRole('button', { name: /\+ Việc con/i });
    expect(addSubTaskButtons.length).toBeGreaterThan(0);
    fireEvent.click(addSubTaskButtons[0]);
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
