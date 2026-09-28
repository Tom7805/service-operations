import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmployeeDetailPage from '../pages/EmployeeDetailPage';
import type { EmployeeDetail, EmployeeHourlyRateRes, ResolvedEmployeeHourlyRateRes } from '../types/employeeTypes';

const mockGetEmployeeById = vi.fn();
const mockAddEmploymentContract = vi.fn();
const mockFetchEmployeeHourlyRates = vi.fn();
const mockCreateEmployeeHourlyRate = vi.fn();
const mockResolveEmployeeHourlyRate = vi.fn();

vi.mock('../api/employeesApi', () => ({
  getEmployeeById: (...args: unknown[]) => mockGetEmployeeById(...args),
  addEmploymentContract: (...args: unknown[]) => mockAddEmploymentContract(...args),
  fetchEmployeeHourlyRates: (...args: unknown[]) => mockFetchEmployeeHourlyRates(...args),
  createEmployeeHourlyRate: (...args: unknown[]) => mockCreateEmployeeHourlyRate(...args),
  resolveEmployeeHourlyRate: (...args: unknown[]) => mockResolveEmployeeHourlyRate(...args),
  EmployeeApiError: class EmployeeApiError extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
    }
  },
}));

const employee: EmployeeDetail = {
  id: 1,
  userId: 5,
  username: 'nhanvien01',
  fullName: 'Nguyễn Văn A',
  departmentId: 2,
  departmentName: 'Phòng kỹ thuật',
  professionalRole: 'Kỹ sư phần mềm',
  standardHoursPerWeek: 40,
  hireDate: '2024-01-01',
  endDate: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  contracts: [],
};

const hourlyRates: EmployeeHourlyRateRes[] = [
  { id: 10, employeeId: 1, hourlyRate: 250_000, effectiveFrom: '2026-01-01' },
];

describe('EmployeeDetailPage — Chi phí giờ công nội bộ (NCL-07-CN-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEmployeeById.mockResolvedValue(employee);
  });

  it('TC-02: vai trò không được phép (ví dụ VT-02) thì không thấy mục chi phí giờ công và không gọi API', async () => {
    render(<EmployeeDetailPage employeeId={1} onBack={vi.fn()} currentUserRoles={['VT-02']} />);

    await waitFor(() => expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument());

    expect(screen.queryByTestId('hourly-rate-section')).toBeNull();
    expect(mockFetchEmployeeHourlyRates).not.toHaveBeenCalled();
  });

  it('VT-05 (Kế toán) xem được lịch sử chi phí giờ công nhưng không có form khai báo', async () => {
    mockFetchEmployeeHourlyRates.mockResolvedValue(hourlyRates);

    render(<EmployeeDetailPage employeeId={1} onBack={vi.fn()} currentUserRoles={['VT-05']} />);

    await waitFor(() => expect(screen.getByTestId('hourly-rate-table')).toBeInTheDocument());
    expect(screen.getByTestId('hourly-rate-table')).toHaveTextContent('250.000');

    expect(screen.queryByLabelText(/Chi phí giờ công \(VNĐ\)/)).toBeNull();
  });

  it('TC-01: VT-06 (Nhân sự) khai báo mốc chi phí giờ công mới thành công thì danh sách cập nhật ngay', async () => {
    mockFetchEmployeeHourlyRates.mockResolvedValue([]);
    const created: EmployeeHourlyRateRes = { id: 20, employeeId: 1, hourlyRate: 300_000, effectiveFrom: '2026-03-01' };
    mockCreateEmployeeHourlyRate.mockResolvedValue(created);

    render(<EmployeeDetailPage employeeId={1} onBack={vi.fn()} currentUserRoles={['VT-06']} />);

    await waitFor(() => expect(screen.getByTestId('hourly-rate-section')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Chi phí giờ công \(VNĐ\)/), { target: { value: '300000' } });
    fireEvent.change(screen.getByLabelText(/Ngày hiệu lực/), { target: { value: '2026-03-01' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Khai báo chi phí giờ công' }));

    await waitFor(() => {
      expect(mockCreateEmployeeHourlyRate).toHaveBeenCalledWith(1, { hourlyRate: 300_000, effectiveFrom: '2026-03-01' });
    });

    await waitFor(() => expect(screen.getByTestId('hourly-rate-table')).toBeInTheDocument());
  });

  it('chặn phía client khi để trống chi phí giờ công, không gọi API tạo', async () => {
    mockFetchEmployeeHourlyRates.mockResolvedValue([]);

    render(<EmployeeDetailPage employeeId={1} onBack={vi.fn()} currentUserRoles={['VT-07']} />);

    await waitFor(() => expect(screen.getByTestId('hourly-rate-section')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '+ Khai báo chi phí giờ công' }));

    expect(await screen.findByText('Chi phí giờ công không được để trống')).toBeInTheDocument();
    expect(mockCreateEmployeeHourlyRate).not.toHaveBeenCalled();
  });

  it('TC-03: tra chi phí tại thời điểm chưa có mốc nào → hiển thị missingCostData như thông báo thông tin', async () => {
    mockFetchEmployeeHourlyRates.mockResolvedValue(hourlyRates);
    const resolved: ResolvedEmployeeHourlyRateRes = {
      employeeId: 1,
      hourlyRate: null,
      effectiveFrom: null,
      missingCostData: true,
    };
    mockResolveEmployeeHourlyRate.mockResolvedValue(resolved);

    render(<EmployeeDetailPage employeeId={1} onBack={vi.fn()} currentUserRoles={['VT-01']} />);

    await waitFor(() => expect(screen.getByTestId('hourly-rate-table')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Ngày phát sinh'), { target: { value: '2020-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tra chi phí' }));

    await waitFor(() => {
      expect(mockResolveEmployeeHourlyRate).toHaveBeenCalledWith(1, '2020-01-01');
    });

    expect(await screen.findByTestId('hourly-rate-missing')).toBeInTheDocument();
  });
});
