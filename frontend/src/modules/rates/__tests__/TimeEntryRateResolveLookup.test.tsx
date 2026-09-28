import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TimeEntryRateResolveLookup from '../components/TimeEntryRateResolveLookup';
import * as ratesApi from '../api/ratesApi';
import type {
  ResolvedTimeEntryRateRes,
  TimeEntryLookupCandidateRes,
  TimeEntryLookupEmployeeRes,
} from '../types/rateTypes';

vi.mock('../api/ratesApi', () => ({
  fetchTimeEntryLookupEmployees: vi.fn(),
  fetchTimeEntryLookupCandidates: vi.fn(),
  resolveTimeEntryBillRate: vi.fn(),
  RatesApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'RatesApiError';
    }
  },
}));

const EMPLOYEE: TimeEntryLookupEmployeeRes = { userId: 7, fullName: 'Nguyễn Văn A', level: 'Cao cấp' };
const CANDIDATE: TimeEntryLookupCandidateRes = {
  entryId: 100,
  workDate: '2026-06-30',
  userId: 7,
  userName: 'Nguyễn Văn A',
  projectId: 2,
  projectName: 'Dự án X',
  taskId: 5,
  taskName: 'Việc Y',
  hours: 8,
};

const LEVEL_OPTIONS = ['Cao cấp'];

/** Chọn nhân sự → đợi danh sách dòng giờ công của người đó nạp xong → chọn dòng → bấm tra. */
async function selectEmployeeAndSubmit(entryId = String(CANDIDATE.entryId)) {
  fireEvent.change(await screen.findByLabelText('Nhân sự'), { target: { value: String(EMPLOYEE.userId) } });
  await waitFor(() => expect(ratesApi.fetchTimeEntryLookupCandidates).toHaveBeenCalledWith(EMPLOYEE.userId));
  fireEvent.change(await screen.findByLabelText('Dòng giờ công'), { target: { value: entryId } });
  fireEvent.click(screen.getByRole('button', { name: 'Tra đơn giá' }));
}

describe('TimeEntryRateResolveLookup (NCL-07-CN-005 — Tra cứu đơn giá áp dụng cho một dòng giờ công)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ratesApi.fetchTimeEntryLookupEmployees).mockResolvedValue([EMPLOYEE]);
    vi.mocked(ratesApi.fetchTimeEntryLookupCandidates).mockResolvedValue([CANDIDATE]);
  });

  it('nạp danh sách nhân sự có giờ công đã duyệt và tự điền sẵn cấp bậc khi chọn', async () => {
    render(<TimeEntryRateResolveLookup levelOptions={LEVEL_OPTIONS} />);

    await screen.findByRole('option', { name: 'Nguyễn Văn A' });
    fireEvent.change(screen.getByLabelText('Nhân sự'), { target: { value: String(EMPLOYEE.userId) } });

    await waitFor(() => {
      expect(ratesApi.fetchTimeEntryLookupCandidates).toHaveBeenCalledWith(7);
    });
    expect(screen.getByLabelText('Cấp bậc')).toHaveValue('Cao cấp');
    expect(await screen.findByRole('option', { name: /Dự án X · Việc Y/ })).toBeInTheDocument();
  });

  it('chặn phía client khi chưa chọn dòng giờ công hoặc cấp bậc, không gọi API', async () => {
    render(<TimeEntryRateResolveLookup levelOptions={LEVEL_OPTIONS} />);
    await screen.findByRole('option', { name: 'Nguyễn Văn A' });

    fireEvent.click(screen.getByRole('button', { name: 'Tra đơn giá' }));

    expect(await screen.findByText('ID dòng giờ công phải là số nguyên dương')).toBeInTheDocument();
    expect(screen.getByText('Cấp bậc không được để trống')).toBeInTheDocument();
    expect(ratesApi.resolveTimeEntryBillRate).not.toHaveBeenCalled();
  });

  it('tra đúng dòng giờ công và hiển thị appliedDailyRate làm trọng tâm (đơn giá cuối cùng đã nhân hệ số)', async () => {
    const resolved: ResolvedTimeEntryRateRes = {
      timeEntryId: 100,
      taskId: 5,
      projectId: 2,
      contractId: 1,
      professionalRole: 'Lập trình viên cao cấp',
      level: 'Cao cấp',
      workDate: '2026-06-30',
      hours: 8,
      workType: 'OVERTIME',
      dailyRate: 3_000_000,
      effectiveFrom: '2026-01-01',
      isContractSpecific: true,
      rateFactor: 1.5,
      appliedDailyRate: 4_500_000,
    };
    vi.mocked(ratesApi.resolveTimeEntryBillRate).mockResolvedValue(resolved);

    render(<TimeEntryRateResolveLookup levelOptions={LEVEL_OPTIONS} />);
    await selectEmployeeAndSubmit();

    await waitFor(() => {
      expect(ratesApi.resolveTimeEntryBillRate).toHaveBeenCalledWith(100, 'Cao cấp');
    });

    const result = await screen.findByTestId('time-entry-rate-resolve-result');
    expect(result).toHaveTextContent('4.500.000');
    expect(result).toHaveTextContent('Đơn giá riêng hợp đồng');
    expect(result).toHaveTextContent('Ngoài giờ hành chính');
    expect(result).toHaveTextContent('3.000.000');
    expect(result).toHaveTextContent('1.5');
  });

  it('404 (dòng giờ công không tồn tại hoặc chưa đủ dữ liệu) hiển thị như thông báo thông tin', async () => {
    vi.mocked(ratesApi.resolveTimeEntryBillRate).mockRejectedValue(
      new ratesApi.RatesApiError('RESOURCE_NOT_FOUND', 'Khong tim thay dong gio cong voi ID: 999', 404)
    );

    render(<TimeEntryRateResolveLookup levelOptions={LEVEL_OPTIONS} />);
    await selectEmployeeAndSubmit();

    const notFound = await screen.findByTestId('time-entry-rate-resolve-not-found');
    expect(notFound).toHaveTextContent('Khong tim thay dong gio cong voi ID: 999');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('403 (vai trò khác VT-05/VT-07) hiển thị như lỗi', async () => {
    vi.mocked(ratesApi.resolveTimeEntryBillRate).mockRejectedValue(
      new ratesApi.RatesApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<TimeEntryRateResolveLookup levelOptions={LEVEL_OPTIONS} />);
    await selectEmployeeAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền thực hiện thao tác này.');
  });
});
