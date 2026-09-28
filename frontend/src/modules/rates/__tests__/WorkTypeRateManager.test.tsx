import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import WorkTypeRateManager from '../components/WorkTypeRateManager';
import * as ratesApi from '../api/ratesApi';
import type { WorkTypeRateFactorRes } from '../types/rateTypes';

vi.mock('../api/ratesApi', () => ({
  fetchWorkTypeRates: vi.fn(),
  upsertWorkTypeRate: vi.fn(),
  RatesApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'RatesApiError';
    }
  },
}));

const defaultRates: WorkTypeRateFactorRes[] = [
  { workType: 'NORMAL', factor: 1 },
  { workType: 'OVERTIME', factor: 1.5 },
  { workType: 'WEEKEND', factor: 2 },
  { workType: 'HOLIDAY', factor: 3 },
];

describe('WorkTypeRateManager (NCL-07-CN-006 — Đơn giá theo loại hình công việc)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tải và hiển thị đúng 4 loại hình với hệ số mặc định', async () => {
    vi.mocked(ratesApi.fetchWorkTypeRates).mockResolvedValue(defaultRates);

    render(<WorkTypeRateManager />);

    await waitFor(() => expect(screen.getByTestId('work-type-rate-table')).toBeInTheDocument());

    expect(screen.getByText('Giờ hành chính')).toBeInTheDocument();
    expect(screen.getByText('Ngoài giờ hành chính')).toBeInTheDocument();
    expect(screen.getByText('Cuối tuần')).toBeInTheDocument();
    expect(screen.getByText('Lễ / Tết')).toBeInTheDocument();
    expect(screen.getByLabelText('Hệ số Ngoài giờ hành chính')).toHaveValue(1.5);
  });

  it('nút Lưu bị vô hiệu khi chưa đổi giá trị, chỉ bật khi có thay đổi', async () => {
    vi.mocked(ratesApi.fetchWorkTypeRates).mockResolvedValue(defaultRates);

    render(<WorkTypeRateManager />);
    await waitFor(() => expect(screen.getByTestId('work-type-rate-table')).toBeInTheDocument());

    const overtimeRow = screen.getByLabelText('Hệ số Ngoài giờ hành chính').closest('tr') as HTMLElement;
    const saveBtn = overtimeRow.querySelector('button') as HTMLButtonElement;
    expect(saveBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Hệ số Ngoài giờ hành chính'), { target: { value: '1.75' } });
    expect(saveBtn).not.toBeDisabled();
  });

  it('sửa hệ số OVERTIME thành công thì gọi đúng payload và hiển thị "Đã lưu"', async () => {
    vi.mocked(ratesApi.fetchWorkTypeRates).mockResolvedValue(defaultRates);
    vi.mocked(ratesApi.upsertWorkTypeRate).mockResolvedValue({ workType: 'OVERTIME', factor: 1.75 });

    render(<WorkTypeRateManager />);
    await waitFor(() => expect(screen.getByTestId('work-type-rate-table')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Hệ số Ngoài giờ hành chính'), { target: { value: '1.75' } });
    const overtimeRow = screen.getByLabelText('Hệ số Ngoài giờ hành chính').closest('tr') as HTMLElement;
    fireEvent.click(overtimeRow.querySelector('button') as HTMLButtonElement);

    await waitFor(() => {
      expect(ratesApi.upsertWorkTypeRate).toHaveBeenCalledWith({ workType: 'OVERTIME', factor: 1.75 });
    });

    expect(await screen.findByText('Đã lưu')).toBeInTheDocument();
  });

  it('chặn phía client khi hệ số <= 0, không gọi API', async () => {
    vi.mocked(ratesApi.fetchWorkTypeRates).mockResolvedValue(defaultRates);

    render(<WorkTypeRateManager />);
    await waitFor(() => expect(screen.getByTestId('work-type-rate-table')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Hệ số Ngoài giờ hành chính'), { target: { value: '0' } });
    const overtimeRow = screen.getByLabelText('Hệ số Ngoài giờ hành chính').closest('tr') as HTMLElement;
    fireEvent.click(overtimeRow.querySelector('button') as HTMLButtonElement);

    expect(await screen.findByText('Hệ số phải lớn hơn 0')).toBeInTheDocument();
    expect(ratesApi.upsertWorkTypeRate).not.toHaveBeenCalled();
  });
});
