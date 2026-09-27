import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FiscalPeriodPage from '../pages/FiscalPeriodPage';
import * as api from '../api/companySettingApi';
import { computeFiscalYear } from '../utils/companySettingUtils';

vi.mock('../api/companySettingApi', () => {
  class MockAdminApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'AdminApiError';
    }
  }
  return {
    getCompanySettings: vi.fn(),
    updateCompanySettings: vi.fn(),
    getFiscalPeriod: vi.fn(),
    getCurrentFiscalPeriod: vi.fn(),
    AdminApiError: MockAdminApiError,
  };
});

describe('FiscalPeriodPage (NCL-15-CN-002 TC-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCurrentFiscalPeriod).mockResolvedValue(computeFiscalYear(2026, 4));
    vi.mocked(api.getFiscalPeriod).mockImplementation(async (y: number) => computeFiscalYear(y, 4));
  });

  it('hiện năm tài chính hiện tại chia từ tháng 4 với 4 quý và 12 kỳ', async () => {
    render(<FiscalPeriodPage currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('fiscal-range')).toHaveTextContent('01/04/2026 → 31/03/2027');
    expect(screen.getByTestId('fiscal-start-month')).toHaveTextContent('tháng 4');
    expect(screen.getByTestId('fiscal-q1')).toHaveTextContent('T4/2026 – T6/2026');
    expect(screen.getByTestId('fiscal-q4')).toHaveTextContent('T1/2027 – T3/2027');
    expect(screen.getByTestId('fiscal-m12')).toHaveTextContent('T3/2027');
    // Không phải quản trị viên → không có nút đổi tháng bắt đầu.
    expect(screen.queryByTestId('fiscal-btn-settings')).not.toBeInTheDocument();
  });

  it('chuyển sang năm sau / nhập năm và quay về năm hiện tại', async () => {
    render(<FiscalPeriodPage currentUserRoles={['VT-05']} />);
    await screen.findByTestId('fiscal-range');

    fireEvent.click(screen.getByTestId('fiscal-next'));
    await waitFor(() => expect(api.getFiscalPeriod).toHaveBeenLastCalledWith(2027));
    expect(await screen.findByTestId('fiscal-range')).toHaveTextContent('01/04/2027');

    fireEvent.change(screen.getByTestId('fiscal-year-input'), { target: { value: '2030' } });
    fireEvent.click(screen.getByTestId('fiscal-go'));
    await waitFor(() => expect(api.getFiscalPeriod).toHaveBeenLastCalledWith(2030));

    fireEvent.click(await screen.findByTestId('fiscal-current'));
    await waitFor(() => expect(api.getFiscalPeriod).toHaveBeenLastCalledWith(2026));
  });

  it('năm ngoài 2000–2100 báo lỗi ngay, không gọi API', async () => {
    render(<FiscalPeriodPage currentUserRoles={['VT-02']} />);
    await screen.findByTestId('fiscal-range');
    fireEvent.change(screen.getByTestId('fiscal-year-input'), { target: { value: '1999' } });
    fireEvent.click(screen.getByTestId('fiscal-go'));

    expect(await screen.findByTestId('fiscal-year-error')).toHaveTextContent('2000–2100');
    expect(api.getFiscalPeriod).not.toHaveBeenCalled();
  });

  it('Quản trị viên có nút mở cấu hình để đổi tháng bắt đầu', async () => {
    const onOpen = vi.fn();
    render(<FiscalPeriodPage currentUserRoles={['VT-07']} onOpenCompanySettings={onOpen} />);
    fireEvent.click(await screen.findByTestId('fiscal-btn-settings'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('403 → trang từ chối truy cập', async () => {
    vi.mocked(api.getCurrentFiscalPeriod).mockRejectedValue(new api.AdminApiError('FORBIDDEN', 'Forbidden', 403));
    render(<FiscalPeriodPage currentUserRoles={['VT-03']} />);
    expect(await screen.findByTestId('fiscal-access-denied')).toBeInTheDocument();
  });
});
