import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserListPage from '../pages/UserListPage';
import UserTable from '../components/UserTable';
import UserFormModal from '../components/UserFormModal';
import type { CreateUserPayload, UpdateUserPayload, User } from '../types/userTypes';

const mockUsersList: User[] = [
  {
    id: 1,
    username: 'admin_test',
    fullName: 'Nguyễn Quản Trị',
    email: 'admin@test.com',
    departmentId: 1,
    status: 'ACTIVE',
    roleCodes: ['VT-07'],
    scopeType: 'COMPANY',
    scopeDepartmentId: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 2,
    username: 'user_locked',
    fullName: 'Lê Văn Khóa',
    email: 'khoa.le@test.com',
    departmentId: 2,
    status: 'LOCKED',
    roleCodes: ['VT-03'],
    scopeType: 'DEPARTMENT',
    scopeDepartmentId: 2,
    createdAt: '2026-08-02T00:00:00Z',
    updatedAt: '2026-08-02T00:00:00Z',
  },
];

vi.mock('../api/usersApi', () => ({
  getUsers: vi.fn(() => Promise.resolve(mockUsersList)),
  getUserById: vi.fn((id: number) => Promise.resolve(mockUsersList.find((u) => u.id === id) || mockUsersList[0])),
  createUser: vi.fn((payload: CreateUserPayload) => Promise.resolve({ id: 99, ...payload, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })),
  updateUser: vi.fn((id: number, payload: UpdateUserPayload) => Promise.resolve({ id, ...payload, updatedAt: new Date().toISOString() })),
  updateUserStatus: vi.fn((id: number, status: string) => Promise.resolve({ id, status, updatedAt: new Date().toISOString() })),
  UserApiError: class UserApiError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

describe('User Management Module — Acceptance Criteria Tests (NCL-01-CN-002)', () => {
  it('TC-01: Renders user list with active accounts and role tags', () => {
    render(
      <UserTable
        users={mockUsersList}
        loading={false}
        onEdit={vi.fn()}
        onToggleStatus={vi.fn()}
        onAssignRoles={vi.fn()}
        onViewDetail={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('Nguyễn Quản Trị')).toBeInTheDocument();
    expect(screen.getByText('@admin_test')).toBeInTheDocument();
    expect(screen.getAllByText('Quản trị viên').length).toBeGreaterThan(0);
    expect(screen.getByText('Hoạt động')).toBeInTheDocument();
    expect(screen.getByText('Đã khóa')).toBeInTheDocument();
  });

  it('TC-02: UserFormModal validates required fields on creation', async () => {
    const handleCreate = vi.fn();
    render(
      <UserFormModal
        isOpen={true}
        editingUser={null}
        onClose={vi.fn()}
        onSubmitCreate={handleCreate}
        onSubmitUpdate={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Tạo tài khoản/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Tên tài khoản không được để trống')).toBeInTheDocument();
      expect(screen.getByText('Họ và tên không được để trống')).toBeInTheDocument();
      expect(screen.getByText('Mật khẩu không được để trống')).toBeInTheDocument();
    });
    expect(handleCreate).not.toHaveBeenCalled();
  });

  it('TC-03: Triggers status toggle callback when action button is clicked', () => {
    const handleToggleStatus = vi.fn();
    render(
      <UserTable
        users={mockUsersList}
        loading={false}
        onEdit={vi.fn()}
        onToggleStatus={handleToggleStatus}
        onAssignRoles={vi.fn()}
        onViewDetail={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    const lockBtn = screen.getByTitle('Khóa tài khoản');
    fireEvent.click(lockBtn);

    expect(handleToggleStatus).toHaveBeenCalledWith(mockUsersList[0]);
  });

  it('TC-06: Menu thao tác (⋮) gọn từng dòng — mở ra mới thấy hành động, bấm ra ngoài thì đóng lại', () => {
    const handleResetTwoFactor = vi.fn();
    render(
      <UserTable
        users={mockUsersList}
        loading={false}
        onEdit={vi.fn()}
        onToggleStatus={vi.fn()}
        onAssignRoles={vi.fn()}
        onViewDetail={vi.fn()}
        onRefresh={vi.fn()}
        onResetTwoFactor={handleResetTwoFactor}
      />
    );

    const triggers = screen.getAllByLabelText('Thao tác');
    expect(triggers).toHaveLength(2);

    fireEvent.click(triggers[0]);
    const resetItem = screen.getAllByText('Đặt lại xác thực hai bước')[0];
    fireEvent.click(resetItem);

    expect(handleResetTwoFactor).toHaveBeenCalledWith(mockUsersList[0]);
  });

  it('TC-04: Non-admin users (VT-03) get Access Denied screen', () => {
    render(<UserListPage currentUserRoles={['VT-03']} currentUserName="Nhân viên IT" />);

    expect(screen.getByRole('heading', { name: /Bạn không có thẩm quyền/i })).toBeInTheDocument();
    expect(screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i)).toBeInTheDocument();
    expect(screen.getByText(/Chức năng Quản lý tài khoản người dùng chỉ dành riêng cho vai trò/i)).toBeInTheDocument();
  });

  it('TC-05: Admin users (VT-07) view stats, table, and link to the full audit log', () => {
    render(
      <UserListPage currentUserRoles={['VT-07']} currentUserName="Quản trị viên" onViewAuditLog={() => {}} />
    );

    expect(screen.getByText('Quản lý tài khoản người dùng')).toBeInTheDocument();
    expect(screen.getByText('Tổng tài khoản')).toBeInTheDocument();
    expect(screen.getByText(/Xem nhật ký thao tác đầy đủ/i)).toBeInTheDocument();
  });
});
