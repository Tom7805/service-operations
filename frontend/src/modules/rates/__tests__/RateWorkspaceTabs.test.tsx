import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import WorkTypeRateStrip from '../components/WorkTypeRateStrip';
import RateLookupPage from '../pages/RateLookupPage';
import ContractRatePage from '../pages/ContractRatePage';
import * as ratesApi from '../api/ratesApi';
import type { WorkTypeRateFactorRes } from '../types/rateTypes';

vi.mock('../api/ratesApi', () => ({
  fetchCurrentBillRates: vi.fn(() => Promise.resolve([])),
  resolveBillRate: vi.fn(),
  fetchContractBillRates: vi.fn(() => Promise.resolve([])),
  createContractBillRate: vi.fn(),
  resolveContractBillRate: vi.fn(),
  resolveTimeEntryBillRate: vi.fn(),
  fetchTimeEntryLookupEmployees: vi.fn(() => Promise.resolve([])),
  fetchTimeEntryLookupCandidates: vi.fn(() => Promise.resolve([])),
  fetchWorkTypeRates: vi.fn(),
  upsertWorkTypeRate: vi.fn(),
  RatesApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'RatesApiError';
    }
  },
}));

vi.mock('../../contracts/api/contractsApi', () => ({
  fetchContracts: vi.fn(() => Promise.resolve([])),
}));

// API trả theo thứ tự tên (Lễ/Tết trước) — dải phải xếp lại theo thứ tự nghiệp vụ.
const factors: WorkTypeRateFactorRes[] = [
  { workType: 'HOLIDAY', factor: 3 },
  { workType: 'NORMAL', factor: 1 },
  { workType: 'OVERTIME', factor: 1.5 },
  { workType: 'WEEKEND', factor: 2 },
];

describe('Khu Đơn giá chia tab — dải hệ số loại giờ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiện 4 hệ số theo thứ tự Giờ hành chính → Ngoài giờ → Cuối tuần → Lễ/Tết, số theo kiểu Việt Nam', async () => {
    vi.mocked(ratesApi.fetchWorkTypeRates).mockResolvedValue(factors);
    render(<WorkTypeRateStrip />);

    const strip = await screen.findByTestId('work-type-rate-strip');
    await waitFor(() => expect(within(strip).getByTestId('work-type-factor-OVERTIME')).toBeInTheDocument());
    const order = within(strip).getAllByTestId(/^work-type-factor-/).map((el) => el.dataset.testid);
    expect(order).toEqual([
      'work-type-factor-NORMAL',
      'work-type-factor-OVERTIME',
      'work-type-factor-WEEKEND',
      'work-type-factor-HOLIDAY',
    ]);
    expect(within(strip).getByTestId('work-type-factor-OVERTIME')).toHaveTextContent('Ngoài giờ hành chính ×1,5');
  });

  it('"Sửa hệ số" mở hộp thoại; lưu xong thì dải cập nhật ngay, Esc đóng hộp thoại', async () => {
    vi.mocked(ratesApi.fetchWorkTypeRates).mockResolvedValue(factors);
    vi.mocked(ratesApi.upsertWorkTypeRate).mockResolvedValue({ workType: 'OVERTIME', factor: 1.75 });
    render(<WorkTypeRateStrip />);
    await screen.findByTestId('work-type-factor-OVERTIME');

    fireEvent.click(screen.getByTestId('work-type-rate-edit'));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByTestId('work-type-rate-table')).toBeInTheDocument());

    fireEvent.change(within(dialog).getByLabelText('Hệ số Ngoài giờ hành chính'), { target: { value: '1.75' } });
    const row = within(dialog).getByLabelText('Hệ số Ngoài giờ hành chính').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Lưu' }));

    await waitFor(() =>
      expect(screen.getByTestId('work-type-factor-OVERTIME')).toHaveTextContent('Ngoài giờ hành chính ×1,75')
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('không tải được hệ số: báo lỗi ngay trong dải và cho thử lại', async () => {
    vi.mocked(ratesApi.fetchWorkTypeRates)
      .mockRejectedValueOnce(new ratesApi.RatesApiError('SERVER', 'Máy chủ bận', 500))
      .mockResolvedValueOnce(factors);
    render(<WorkTypeRateStrip />);

    expect(await screen.findByText(/Máy chủ bận/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByTestId('work-type-factor-NORMAL')).toBeInTheDocument();
  });
});

describe('Khu Đơn giá chia tab — tab Tra cứu và tab Theo hợp đồng', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Tra cứu: mặc định tra theo thời điểm, chuyển sang theo dòng giờ công thì chỉ còn khối đó', async () => {
    render(<RateLookupPage currentUserRoles={['VT-05']} currentUserName="Vũ Thị Lan" />);

    expect(screen.getByTestId('rate-lookup-mode-date')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('rate-resolve-lookup')).toBeInTheDocument();
    expect(screen.queryByTestId('time-entry-rate-resolve-lookup')).toBeNull();

    fireEvent.click(screen.getByTestId('rate-lookup-mode-entry'));
    expect(screen.getByTestId('time-entry-rate-resolve-lookup')).toBeInTheDocument();
    expect(screen.queryByTestId('rate-resolve-lookup')).toBeNull();
    await waitFor(() => expect(ratesApi.fetchTimeEntryLookupEmployees).toHaveBeenCalled());
  });

  it('Tra cứu và Theo hợp đồng: vai trò khác Kế toán/Quản trị viên bị từ chối, không gọi API', () => {
    const { unmount } = render(<RateLookupPage currentUserRoles={['VT-02']} currentUserName="Trần Thu Hà" />);
    expect(screen.getByTestId('rate-lookup-access-denied')).toBeInTheDocument();
    unmount();

    render(<ContractRatePage currentUserRoles={['VT-02']} currentUserName="Trần Thu Hà" />);
    expect(screen.getByTestId('contract-rate-access-denied')).toBeInTheDocument();
    expect(ratesApi.fetchCurrentBillRates).not.toHaveBeenCalled();
  });

  it('Theo hợp đồng: Kế toán thấy khối đơn giá riêng theo hợp đồng', async () => {
    render(<ContractRatePage currentUserRoles={['VT-05']} currentUserName="Vũ Thị Lan" />);
    expect(screen.getByTestId('contract-rate-manager')).toBeInTheDocument();
    await waitFor(() => expect(ratesApi.fetchCurrentBillRates).toHaveBeenCalled());
  });
});
