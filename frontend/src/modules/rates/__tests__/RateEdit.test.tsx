import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BillRatePage from '../pages/BillRatePage';
import ContractRateManager from '../components/ContractRateManager';
import * as ratesApi from '../api/ratesApi';
import * as contractsApi from '../../contracts/api/contractsApi';
import type { BillRateRes, ContractBillRateRes } from '../types/rateTypes';
import { todayIso } from '../utils/rateFormat';

vi.mock('../api/ratesApi', () => ({
  fetchCurrentBillRates: vi.fn(),
  createBillRate: vi.fn(),
  updateBillRate: vi.fn(),
  fetchContractBillRates: vi.fn(),
  createContractBillRate: vi.fn(),
  updateContractBillRate: vi.fn(),
  resolveContractBillRate: vi.fn(),
  fetchWorkTypeRates: vi.fn(() => Promise.resolve([])),
  upsertWorkTypeRate: vi.fn(),
  RatesApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'RatesApiError';
    }
  },
}));

vi.mock('../../contracts/api/contractsApi', () => ({
  fetchContracts: vi.fn(),
}));

const TODAY = todayIso();

function openEdit(tableTestId: string, rowText: string) {
  const row = within(screen.getByTestId(tableTestId)).getByText(rowText).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /^Thao tác với đơn giá/ }));
  fireEvent.click(screen.getByRole('menuitem', { name: /Sửa đơn giá/ }));
  return screen.getByTestId('rate-edit-modal');
}

describe('Sửa đơn giá — bảng giá chung', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dòng khai báo hôm nay: sửa thẳng (PUT), bảng cập nhật; hôm nay không bị gắn "Sắp hiệu lực"', async () => {
    const rates: BillRateRes[] = [
      { id: 7, professionalRole: 'Lập trình viên', level: 'Cao cấp', dailyRate: 4_000_000, effectiveFrom: TODAY },
    ];
    vi.mocked(ratesApi.updateBillRate).mockResolvedValue({ ...rates[0], dailyRate: 3_600_000 });
    render(<BillRatePage currentUserRoles={['VT-05']} initialBillRates={rates} />);

    const table = screen.getByTestId('bill-rate-table');
    expect(within(table).queryByText('Sắp hiệu lực')).toBeNull();

    const modal = openEdit('bill-rate-table', 'Lập trình viên');
    expect(within(modal).getByTestId('rate-edit-note')).toHaveTextContent('sửa thẳng được');
    expect(within(modal).getByTestId('rate-edit-submit')).toBeDisabled();

    fireEvent.change(within(modal).getByTestId('rate-edit-daily'), { target: { value: '3.600.000' } });
    expect(within(modal).getByText(/450\.000/)).toBeInTheDocument();
    fireEvent.click(within(modal).getByTestId('rate-edit-submit'));

    await waitFor(() =>
      expect(ratesApi.updateBillRate).toHaveBeenCalledWith(7, { dailyRate: 3_600_000, effectiveFrom: TODAY })
    );
    await waitFor(() => expect(screen.queryByTestId('rate-edit-modal')).toBeNull());
    expect(within(table).getByText(/3\.600\.000/)).toBeInTheDocument();
    expect(ratesApi.createBillRate).not.toHaveBeenCalled();
  });

  it('dòng đã áp dụng từ trước: không sửa đè — ghi mức mới từ hôm nay (POST), thay mức cũ trong bảng', async () => {
    const rates: BillRateRes[] = [
      { id: 3, professionalRole: 'Kiểm thử', level: 'Trung cấp', dailyRate: 2_400_000, effectiveFrom: '2024-01-01' },
    ];
    vi.mocked(ratesApi.createBillRate).mockResolvedValue({
      id: 9, professionalRole: 'Kiểm thử', level: 'Trung cấp', dailyRate: 2_600_000, effectiveFrom: TODAY,
    });
    render(<BillRatePage currentUserRoles={['VT-05']} initialBillRates={rates} />);

    const modal = openEdit('bill-rate-table', 'Kiểm thử');
    expect(within(modal).getByTestId('rate-edit-note')).toHaveTextContent('đã áp dụng từ 1/1/2024');
    expect(within(modal).getByTestId('rate-edit-from')).toHaveValue(TODAY);

    fireEvent.change(within(modal).getByTestId('rate-edit-daily'), { target: { value: '2600000' } });
    fireEvent.click(within(modal).getByTestId('rate-edit-submit'));

    await waitFor(() =>
      expect(ratesApi.createBillRate).toHaveBeenCalledWith({
        professionalRole: 'Kiểm thử', level: 'Trung cấp', dailyRate: 2_600_000, effectiveFrom: TODAY,
      })
    );
    expect(ratesApi.updateBillRate).not.toHaveBeenCalled();
    const table = screen.getByTestId('bill-rate-table');
    await waitFor(() => expect(within(table).getByText(/2\.600\.000/)).toBeInTheDocument());
    expect(within(table).queryByText(/2\.400\.000/)).toBeNull();
  });

  it('máy chủ từ chối: hộp thoại giữ nguyên và hiện đúng lý do', async () => {
    const rates: BillRateRes[] = [
      { id: 7, professionalRole: 'Lập trình viên', level: 'Cao cấp', dailyRate: 4_000_000, effectiveFrom: TODAY },
    ];
    vi.mocked(ratesApi.updateBillRate).mockRejectedValue(
      new ratesApi.RatesApiError('DUPLICATE_DATA', 'Đã có đơn giá cho vai trò và cấp bậc này tại ngày hiệu lực đã chọn', 409)
    );
    render(<BillRatePage currentUserRoles={['VT-05']} initialBillRates={rates} />);

    const modal = openEdit('bill-rate-table', 'Lập trình viên');
    fireEvent.change(within(modal).getByTestId('rate-edit-daily'), { target: { value: '3600000' } });
    fireEvent.click(within(modal).getByTestId('rate-edit-submit'));

    expect(await within(modal).findByRole('alert')).toHaveTextContent('Đã có đơn giá cho vai trò');
    expect(screen.getByTestId('rate-edit-modal')).toBeInTheDocument();
  });
});

describe('Sửa đơn giá — đơn giá riêng theo hợp đồng', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sửa thẳng một mốc chưa áp dụng của hợp đồng (PUT đúng hợp đồng, đúng dòng)', async () => {
    vi.mocked(contractsApi.fetchContracts).mockResolvedValue([
      { id: 5, contractCode: 'HD-KHO', name: 'Phần mềm quản lý kho', customerName: 'Logistics Toàn Cầu' },
    ] as never);
    const rates: ContractBillRateRes[] = [
      { id: 11, contractId: 5, professionalRole: 'Lập trình viên', level: 'Cao cấp', dailyRate: 3_800_000, effectiveFrom: TODAY },
    ];
    vi.mocked(ratesApi.fetchContractBillRates).mockResolvedValue(rates);
    vi.mocked(ratesApi.updateContractBillRate).mockResolvedValue({ ...rates[0], dailyRate: 3_600_000 });

    render(<ContractRateManager currentUserRoles={['VT-05']} roleOptions={[]} levelsByRole={{}} />);
    await waitFor(() => expect(screen.getByRole('option', { name: /HD-KHO/ })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Hợp đồng'), { target: { value: '5' } });
    await screen.findByTestId('contract-rate-table');

    const modal = openEdit('contract-rate-table', 'Lập trình viên');
    expect(modal).toHaveTextContent('HD-KHO');
    fireEvent.change(within(modal).getByTestId('rate-edit-daily'), { target: { value: '3600000' } });
    fireEvent.click(within(modal).getByTestId('rate-edit-submit'));

    await waitFor(() =>
      expect(ratesApi.updateContractBillRate).toHaveBeenCalledWith(5, 11, { dailyRate: 3_600_000, effectiveFrom: TODAY })
    );
    await waitFor(() => expect(within(screen.getByTestId('contract-rate-table')).getByText(/3\.600\.000/)).toBeInTheDocument());
  });
});
