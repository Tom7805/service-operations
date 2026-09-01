import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmployeeListPage from '../pages/EmployeeListPage';
import type { Employee } from '../types/employeeTypes';

const mockGetEmployees = vi.fn();
const mockCreateEmployee = vi.fn();
const mockUpdateEmployee = vi.fn();

vi.mock('../api/employeesApi', () => ({
  getEmployees: (...args: unknown[]) => mockGetEmployees(...args),
  createEmployee: (...args: unknown[]) => mockCreateEmployee(...args),
  updateEmployee: (...args: unknown[]) => mockUpdateEmployee(...args),
  EmployeeApiError: class EmployeeApiError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message);
    }
  },
}));

vi.mock('../../users/api/usersApi', () => ({
  getUsers: vi.fn(() => Promise.resolve([])),
  getDepartmentsList: vi.fn(() => Promise.resolve([])),
}));

const mockEmployees: Employee[] = [
  {
    id: 1,
    userId: 5,
    username: 'nhanvien01',
    fullName: 'Nguyễn Văn A',
    departmentId: 2,
    departmentName: 'Phòng kỹ thuật',
    professionalRole: 'Kỹ sư phần mềm',
    standardHoursPerWeek: 40,
    hireDate: '2026-01-01',
    endDate: null,
  },
  {
    id: 2,
    userId: 6,
    username: 'banthoi_gian',
    fullName: 'Trần Thị B',
    departmentId: 2,
    departmentName: 'Phòng kỹ thuật',
    professionalRole: 'Trợ lý',
    standardHoursPerWeek: 20,
    hireDate: '2026-02-01',
    endDate: null,
  },
];

describe('EmployeeListPage — Acceptance Criteria Tests (NCL-01-CN-007)', () => {
  beforeEach(() => {
    mockGetEmployees.mockReset();
    mockCreateEmployee.mockReset();
    mockUpdateEmployee.mockReset();
  });

  it('TC-04: Vai trò khác VT-06/VT-07 nhận màn hình Access Denied và không gọi API', () => {
    render(<EmployeeListPage currentUserRoles={['VT-03']} currentUserName="Nhân viên chuyên môn" />);

    expect(screen.getByRole('heading', { name: /Bạn không có thẩm quyền/i })).toBeInTheDocument();
    expect(mockGetEmployees).not.toHaveBeenCalled();
  });

  it('TC-04: Nhân sự (VT-06) và Quản trị viên (VT-07) đều truy cập được', async () => {
    mockGetEmployees.mockResolvedValue(mockEmployees);

    render(<EmployeeListPage currentUserRoles={['VT-06']} currentUserName="Nhân sự" />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });
    expect(mockGetEmployees).toHaveBeenCalled();
  });

  it('TC-01/TC-02: hiển thị đúng giờ làm việc chuẩn mặc định 40 và giá trị tùy chỉnh không bị làm tròn', async () => {
    mockGetEmployees.mockResolvedValue(mockEmployees);

    render(<EmployeeListPage currentUserRoles={['VT-07']} currentUserName="Quản trị viên" />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });

    // Nhân sự mặc định 40 giờ — không gắn nhãn "Tùy chỉnh"
    const row40 = screen.getByText('Nguyễn Văn A').closest('tr');
    expect(row40).not.toBeNull();
    expect(row40!.textContent).toContain('40');
    expect(row40!.textContent).not.toContain('Tùy chỉnh');

    // Nhân sự bán thời gian 20 giờ — giữ nguyên giá trị, có gắn nhãn "Tùy chỉnh"
    const row20 = screen.getByText('Trần Thị B').closest('tr');
    expect(row20).not.toBeNull();
    expect(row20!.textContent).toContain('20');
    expect(row20!.textContent).toContain('Tùy chỉnh');
  });

  it('Hiển thị trạng thái rỗng khi chưa có hồ sơ nhân sự nào', async () => {
    mockGetEmployees.mockResolvedValue([]);

    render(<EmployeeListPage currentUserRoles={['VT-06']} currentUserName="Nhân sự" />);

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy hồ sơ nhân sự nào.')).toBeInTheDocument();
    });
  });
});
