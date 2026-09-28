import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MarginAlertThresholdPage from '../pages/MarginAlertThresholdPage';
import * as profitabilityApi from '../api/profitabilityApi';
import type { MarginAlertThresholdRes } from '../types/profitabilityTypes';

vi.mock('../api/profitabilityApi', () => {
  class MockProfitabilityApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number,
      public readonly fieldErrors?: Array<{ field: string; message: string }>
    ) {
      super(message);
      this.name = 'ProfitabilityApiError';
    }
  }

  return {
    getMarginAlertThreshold: vi.fn(),
    setMarginAlertThreshold: vi.fn(),
    ProfitabilityApiError: MockProfitabilityApiError,
  };
});

const THRESHOLD_SET: MarginAlertThresholdRes = {
  minMarginRate: 0.15,
  updatedBy: 'giamdoc',
  updatedAt: '2026-09-18T17:03:56',
};

const THRESHOLD_UNSET: MarginAlertThresholdRes = {
  minMarginRate: null,
  updatedBy: null,
  updatedAt: null,
};

describe('MarginAlertThresholdPage (NCL-09-CN-004 — Cảnh báo dự án âm biên)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò không được xem (VT-03)', () => {
    render(<MarginAlertThresholdPage currentUserRoles={['VT-03']} />);
    expect(screen.getByTestId('margin-threshold-forbidden')).toBeInTheDocument();
    expect(profitabilityApi.getMarginAlertThreshold).not.toHaveBeenCalled();
  });

  it('tải và hiển thị ngưỡng hiện hành', async () => {
    vi.mocked(profitabilityApi.getMarginAlertThreshold).mockResolvedValue(THRESHOLD_SET);

    render(<MarginAlertThresholdPage currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('margin-threshold-current')).toHaveTextContent('15,00%');
    expect(screen.getByTestId('margin-threshold-current')).toHaveTextContent('giamdoc');
  });

  it('hiển thị cảnh báo khi chưa từng thiết lập ngưỡng', async () => {
    vi.mocked(profitabilityApi.getMarginAlertThreshold).mockResolvedValue(THRESHOLD_UNSET);

    render(<MarginAlertThresholdPage currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('margin-threshold-unset')).toHaveTextContent('Chưa thiết lập');
  });

  it('VT-01 thấy form chỉnh sửa ngưỡng', async () => {
    vi.mocked(profitabilityApi.getMarginAlertThreshold).mockResolvedValue(THRESHOLD_SET);

    render(<MarginAlertThresholdPage currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('margin-threshold-form')).toBeInTheDocument();
    expect(screen.getByTestId('margin-threshold-input')).toHaveValue(15);
  });

  it('VT-02 và VT-05 chỉ xem, không thấy form chỉnh sửa', async () => {
    vi.mocked(profitabilityApi.getMarginAlertThreshold).mockResolvedValue(THRESHOLD_SET);

    render(<MarginAlertThresholdPage currentUserRoles={['VT-02']} />);

    await screen.findByTestId('margin-threshold-current');
    expect(screen.queryByTestId('margin-threshold-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('margin-threshold-readonly-notice')).toBeInTheDocument();
  });

  it('VT-01 lưu ngưỡng mới thành công', async () => {
    vi.mocked(profitabilityApi.getMarginAlertThreshold).mockResolvedValue(THRESHOLD_SET);
    vi.mocked(profitabilityApi.setMarginAlertThreshold).mockResolvedValue({
      minMarginRate: 0.2,
      updatedBy: 'giamdoc',
      updatedAt: '2026-09-19T09:00:00',
    });

    render(<MarginAlertThresholdPage currentUserRoles={['VT-01']} />);

    await screen.findByTestId('margin-threshold-form');
    fireEvent.change(screen.getByTestId('margin-threshold-input'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('btn-save-margin-threshold'));

    await waitFor(() =>
      expect(profitabilityApi.setMarginAlertThreshold).toHaveBeenCalledWith({ minMarginRate: 0.2 })
    );
    expect(await screen.findByTestId('margin-threshold-success')).toBeInTheDocument();
  });

  it('báo lỗi validate khi để trống ngưỡng', async () => {
    vi.mocked(profitabilityApi.getMarginAlertThreshold).mockResolvedValue(THRESHOLD_SET);

    render(<MarginAlertThresholdPage currentUserRoles={['VT-01']} />);

    await screen.findByTestId('margin-threshold-form');
    fireEvent.change(screen.getByTestId('margin-threshold-input'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('btn-save-margin-threshold'));

    expect(await screen.findByTestId('error-margin-threshold')).toHaveTextContent('không được để trống');
    expect(profitabilityApi.setMarginAlertThreshold).not.toHaveBeenCalled();
  });

  it('báo lỗi validate khi ngưỡng ngoài khoảng -100..100', async () => {
    vi.mocked(profitabilityApi.getMarginAlertThreshold).mockResolvedValue(THRESHOLD_SET);

    render(<MarginAlertThresholdPage currentUserRoles={['VT-01']} />);

    await screen.findByTestId('margin-threshold-form');
    fireEvent.change(screen.getByTestId('margin-threshold-input'), { target: { value: '150' } });
    fireEvent.click(screen.getByTestId('btn-save-margin-threshold'));

    expect(await screen.findByTestId('error-margin-threshold')).toHaveTextContent('không hợp lệ');
    expect(profitabilityApi.setMarginAlertThreshold).not.toHaveBeenCalled();
  });

  it('hiển thị lỗi 403 khi backend từ chối lưu (phòng hờ, dù UI đã ẩn form)', async () => {
    vi.mocked(profitabilityApi.getMarginAlertThreshold).mockResolvedValue(THRESHOLD_SET);
    vi.mocked(profitabilityApi.setMarginAlertThreshold).mockRejectedValue(
      new profitabilityApi.ProfitabilityApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<MarginAlertThresholdPage currentUserRoles={['VT-01']} />);

    await screen.findByTestId('margin-threshold-form');
    fireEvent.change(screen.getByTestId('margin-threshold-input'), { target: { value: '10' } });
    fireEvent.click(screen.getByTestId('btn-save-margin-threshold'));

    expect(await screen.findByTestId('margin-threshold-error')).toHaveTextContent(
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });

  it('hiển thị trạng thái loading trong khi tải dữ liệu', () => {
    vi.mocked(profitabilityApi.getMarginAlertThreshold).mockImplementation(() => new Promise(() => {}));

    render(<MarginAlertThresholdPage currentUserRoles={['VT-01']} />);

    expect(screen.getByTestId('margin-threshold-loading')).toBeInTheDocument();
  });

  it('hiển thị lỗi khi tải ngưỡng thất bại', async () => {
    vi.mocked(profitabilityApi.getMarginAlertThreshold).mockRejectedValue(new Error('Network down'));

    render(<MarginAlertThresholdPage currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('margin-threshold-error')).toHaveTextContent('Network down');
  });

  it('nút tải lại gọi lại API', async () => {
    vi.mocked(profitabilityApi.getMarginAlertThreshold).mockResolvedValue(THRESHOLD_SET);

    render(<MarginAlertThresholdPage currentUserRoles={['VT-01']} />);

    await screen.findByTestId('margin-threshold-current');
    fireEvent.click(screen.getByTestId('btn-reload-margin-threshold'));

    await waitFor(() => expect(profitabilityApi.getMarginAlertThreshold).toHaveBeenCalledTimes(2));
  });
});
