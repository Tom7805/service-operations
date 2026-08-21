import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DepartmentTreePage from '../pages/DepartmentTreePage';
import DepartmentTree from '../components/DepartmentTree';
import DepartmentFormModal from '../components/DepartmentFormModal';
import type { Department, DepartmentTreeNode } from '../types/departmentTypes';

const mockTreeList: DepartmentTreeNode[] = [
  {
    id: 1,
    name: 'Ban Giám Đốc',
    managerId: 10,
    managerName: 'Nguyễn Văn Giám Đốc',
    children: [
      {
        id: 2,
        name: 'Trung Tâm Công Nghệ & Giải Pháp',
        managerId: 11,
        managerName: 'Trần Trưởng Phòng Tech',
        children: [
          {
            id: 3,
            name: 'Phát Triển Phần Mềm',
            managerId: 12,
            managerName: 'Lê Trưởng Nhóm Dev',
            children: [],
          },
        ],
      },
    ],
  },
];

const mockFlatList: Department[] = [
  { id: 1, name: 'Ban Giám Đốc', parentId: null, managerId: 10, managerName: 'Nguyễn Văn Giám Đốc' },
  { id: 2, name: 'Trung Tâm Công Nghệ & Giải Pháp', parentId: 1, managerId: 11, managerName: 'Trần Trưởng Phòng Tech' },
  { id: 3, name: 'Phát Triển Phần Mềm', parentId: 2, managerId: 12, managerName: 'Lê Trưởng Nhóm Dev' },
];

vi.mock('../api/departmentsApi', () => ({
  getDepartmentTree: vi.fn(() => Promise.resolve(mockTreeList)),
  getDepartments: vi.fn(() => Promise.resolve(mockFlatList)),
  getDepartmentById: vi.fn((id: number) => Promise.resolve(mockFlatList.find((d) => d.id === id) || mockFlatList[0])),
  createDepartment: vi.fn((payload: any) => Promise.resolve({ id: 99, ...payload, managerName: 'Người quản lý mới' })),
  updateDepartment: vi.fn((id: number, payload: any) => Promise.resolve({ id, ...payload, managerName: 'Cập nhật' })),
  moveDepartment: vi.fn((id: number, payload: any) => Promise.resolve({ id, name: 'Đơn vị di chuyển', parentId: payload.parentId })),
  deleteDepartment: vi.fn(() => Promise.resolve()),
  DepartmentApiError: class DepartmentApiError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

vi.mock('../../users/api/usersApi', () => ({
  getUsers: vi.fn(() =>
    Promise.resolve([
      { id: 10, username: 'bgd_admin', fullName: 'Nguyễn Văn Giám Đốc', email: 'bgd@test.com', status: 'ACTIVE', roleCodes: ['VT-01'], createdAt: '', updatedAt: '' },
      { id: 11, username: 'tech_lead', fullName: 'Trần Trưởng Phòng Tech', email: 'tech@test.com', status: 'ACTIVE', roleCodes: ['VT-02'], createdAt: '', updatedAt: '' },
    ])
  ),
}));

describe('Organization Tree Module — Acceptance Criteria Tests (NCL-01-CN-003)', () => {
  it('TC-01: Renders organization tree structure and manager badges', () => {
    render(
      <DepartmentTree
        treeData={mockTreeList}
        flatData={mockFlatList}
        loading={false}
        searchKeyword=""
        viewMode="TREE"
        onAddChild={vi.fn()}
        onEdit={vi.fn()}
        onMove={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Ban Giám Đốc')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn Giám Đốc')).toBeInTheDocument();
    expect(screen.getByText('Trung Tâm Công Nghệ & Giải Pháp')).toBeInTheDocument();
  });

  it('TC-02: DepartmentFormModal validates required fields on creation', async () => {
    const handleCreate = vi.fn();
    render(
      <DepartmentFormModal
        isOpen={true}
        editingDepartment={null}
        departmentsList={mockFlatList}
        managersList={[{ id: 10, fullName: 'Nguyễn Văn A', username: 'nva' }]}
        onClose={vi.fn()}
        onSubmitCreate={handleCreate}
        onSubmitUpdate={vi.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/Tên bộ phận/i);
    fireEvent.change(nameInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Tạo bộ phận mới/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Tên bộ phận không được để trống')).toBeInTheDocument();
    });
    expect(handleCreate).not.toHaveBeenCalled();
  });

  it('TC-03: Action buttons trigger callbacks correctly', () => {
    const handleEdit = vi.fn();
    const handleMove = vi.fn();
    const handleDelete = vi.fn();

    render(
      <DepartmentTree
        treeData={mockTreeList}
        flatData={mockFlatList}
        loading={false}
        searchKeyword=""
        viewMode="TREE"
        onAddChild={vi.fn()}
        onEdit={handleEdit}
        onMove={handleMove}
        onDelete={handleDelete}
      />
    );

    const editBtns = screen.getAllByTitle('Chỉnh sửa bộ phận');
    fireEvent.click(editBtns[0]);
    expect(handleEdit).toHaveBeenCalledWith(mockFlatList[0]);

    const moveBtns = screen.getAllByTitle('Di chuyển vị trí bộ phận');
    fireEvent.click(moveBtns[0]);
    expect(handleMove).toHaveBeenCalledWith(mockFlatList[0]);

    const deleteBtns = screen.getAllByTitle('Xóa bộ phận');
    fireEvent.click(deleteBtns[0]);
    expect(handleDelete).toHaveBeenCalledWith(mockFlatList[0]);
  });

  it('TC-04: Non-admin users (VT-03) get Access Denied screen', () => {
    render(<DepartmentTreePage currentUserRoles={['VT-03']} currentUserName="Nhân viên IT" />);

    expect(screen.getByText('Từ chối truy cập (Access Denied)')).toBeInTheDocument();
    expect(screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i)).toBeInTheDocument();
    expect(screen.getByText(/Chức năng Khai báo cây tổ chức chỉ dành riêng cho vai trò/i)).toBeInTheDocument();
  });

  it('TC-05: Admin users (VT-07) view stats, audit log stream, and tree controls', () => {
    render(<DepartmentTreePage currentUserRoles={['VT-07']} currentUserName="Quản trị viên" />);

    expect(screen.getByText('Màn hình khai báo cây tổ chức (NCL-01-CN-003)')).toBeInTheDocument();
    expect(screen.getByText('Tổng số bộ phận')).toBeInTheDocument();
    expect(screen.getByText(/Nhật ký khai báo cây tổ chức/i)).toBeInTheDocument();
  });
});
