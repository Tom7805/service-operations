import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RolePermissionPage from '../pages/RolePermissionPage';
import RoleScopeModal from '../components/RoleScopeModal';
import type { ScopeType, User } from '../types/userTypes';

interface UpdateUserRoleScopeParams {
  fullName: string;
  email?: string | null;
  departmentId?: number | null;
  roleCodes: string[];
  scopeType: ScopeType;
  scopeDepartmentId?: number | null;
}

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
    username: 'pm_lead',
    fullName: 'Trần Quản Lý',
    email: 'pm@test.com',
    departmentId: 2,
    status: 'ACTIVE',
    roleCodes: ['VT-02'],
    scopeType: 'DEPARTMENT',
    scopeDepartmentId: 2,
    createdAt: '2026-08-02T00:00:00Z',
    updatedAt: '2026-08-02T00:00:00Z',
  },
  {
    id: 3,
    username: 'dev_user',
    fullName: 'Lê Chuyên Môn',
    email: 'dev@test.com',
    departmentId: 2,
    status: 'ACTIVE',
    roleCodes: ['VT-03'],
    scopeType: 'SELF',
    scopeDepartmentId: null,
    createdAt: '2026-08-03T00:00:00Z',
    updatedAt: '2026-08-03T00:00:00Z',
  },
];

const mockDepartments = [
  { id: 1, name: 'Ban Giám Đốc' },
  { id: 2, name: 'Phòng Quản Lý Dự Án (PMO)' },
];

vi.mock('../api/usersApi', () => ({
  getUsers: vi.fn(() => Promise.resolve(mockUsersList)),
  getDepartmentsList: vi.fn(() => Promise.resolve(mockDepartments)),
  getRoles: vi.fn(() =>
    Promise.resolve([
      { id: 1, code: 'VT-01', name: 'Ban giám đốc', description: 'Theo dõi tổng quan tài chính' },
      { id: 2, code: 'VT-02', name: 'Quản lý dự án', description: 'Quản lý dự án' },
      { id: 7, code: 'VT-07', name: 'Quản trị viên', description: 'Quản trị hệ thống' },
    ])
  ),
  updateUserRoleScope: vi.fn((id: number, payload: UpdateUserRoleScopeParams) =>
    Promise.resolve({ id, ...payload, updatedAt: new Date().toISOString() })
  ),
  UserApiError: class UserApiError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

describe('Role & Data Scope Module — Acceptance Criteria Tests (NCL-01-CN-004)', () => {
  it('TC-01: Renders user permissions list with role tags and scope badges', async () => {
    render(<RolePermissionPage currentUserRoles={['VT-07']} currentUserName="Quản trị viên" />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Quản Trị')).toBeInTheDocument();
      expect(screen.getByText('@admin_test')).toBeInTheDocument();
      expect(screen.getByText('Trần Quản Lý')).toBeInTheDocument();
      expect(screen.getByText('Lê Chuyên Môn')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Toàn công ty \(COMPANY\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nhánh bộ phận \(DEPARTMENT\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Chỉ cá nhân \(SELF\)/i).length).toBeGreaterThan(0);
  });

  it('TC-02: RoleScopeModal validates department selection when scope is DEPARTMENT', async () => {
    const handleSave = vi.fn();
    render(
      <RoleScopeModal
        isOpen={true}
        user={mockUsersList[0]}
        departmentsList={mockDepartments}
        onClose={vi.fn()}
        onSave={handleSave}
      />
    );

    // Switch scope to DEPARTMENT
    const deptScopeRadio = screen.getByLabelText(/Một nhánh tổ chức/i);
    fireEvent.click(deptScopeRadio);

    // Clear department select by choosing empty
    const deptSelect = screen.getByLabelText(/Chọn bộ phận áp dụng phạm vi/i);
    fireEvent.change(deptSelect, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu phân quyền & phạm vi/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Phải chọn bộ phận khi phạm vi là một nhánh tổ chức.')).toBeInTheDocument();
    });
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('TC-03: Submitting valid role and scope triggers save callback', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    render(
      <RoleScopeModal
        isOpen={true}
        user={mockUsersList[0]}
        departmentsList={mockDepartments}
        onClose={vi.fn()}
        onSave={handleSave}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Lưu phân quyền & phạm vi/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(1, ['VT-07'], 'COMPANY', null);
    });
  });

  it('TC-04: Non-admin users (VT-03) receive Access Denied screen', () => {
    render(<RolePermissionPage currentUserRoles={['VT-03']} currentUserName="Nhân viên IT" />);

    expect(screen.getByText('Từ chối truy cập (Access Denied)')).toBeInTheDocument();
    expect(screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i)).toBeInTheDocument();
    expect(screen.getByText(/Chức năng Phân quyền theo vai trò và phạm vi dữ liệu chỉ dành riêng/i)).toBeInTheDocument();
  });

  it('TC-05: Admin users view stats, role capability matrix, and link to the full audit log', async () => {
    render(
      <RolePermissionPage currentUserRoles={['VT-07']} currentUserName="Quản trị viên" onViewAuditLog={() => {}} />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Phân quyền vai trò & Phạm vi dữ liệu' })).toBeInTheDocument();
      expect(screen.getByText('9 Vai trò')).toBeInTheDocument();
      expect(screen.getByText(/Xem nhật ký phân quyền đầy đủ/i)).toBeInTheDocument();
    });

    // Switch to Role Matrix tab
    const matrixTabBtn = screen.getByRole('button', { name: /Ma trận vai trò & quyền hạn/i });
    fireEvent.click(matrixTabBtn);

    expect(screen.getByText('Quản lý dự án (PM)')).toBeInTheDocument();
    expect(screen.getByText('Nhân sự (HR)')).toBeInTheDocument();
  });
});
