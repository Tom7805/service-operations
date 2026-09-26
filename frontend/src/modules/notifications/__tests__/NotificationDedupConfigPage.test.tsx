import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationDedupConfigPage from '../pages/NotificationDedupConfigPage';
import { validateCooldown } from '../components/DedupConfigCard';
import * as notificationsApi from '../api/notificationsApi';
import type { NotificationDedupConfig } from '../types/notificationTypes';

vi.mock('../api/notificationsApi', () => {
  class MockNotificationsApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'NotificationsApiError';
    }
  }
  return {
    getDedupConfigs: vi.fn(),
    updateDedupConfig: vi.fn(),
    NotificationsApiError: MockNotificationsApiError,
  };
});

const DEFAULT_CONFIG: NotificationDedupConfig = {
  eventType: 'TASK_BUDGET_EXCEEDED',
  dedupEnabled: true,
  cooldownHours: null,
  updatedBy: null,
  updatedAt: null,
};

const T = 'TASK_BUDGET_EXCEEDED';

describe('NotificationDedupConfigPage (NCL-14-CN-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.getDedupConfigs).mockResolvedValue([DEFAULT_CONFIG]);
    vi.mocked(notificationsApi.updateDedupConfig).mockResolvedValue(undefined);
  });

  it('hiển thị cấu hình mặc định: bật chống trùng, mỗi đợt gửi 1 lần, chưa từng thay đổi', async () => {
    render(<NotificationDedupConfigPage currentUserRoles={['VT-07']} />);

    expect(await screen.findByText('Công việc vượt ngân sách giờ công')).toBeInTheDocument();
    expect(screen.getByTestId(`dedup-switch-${T}`)).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId(`dedup-mode-none-${T}`)).toBeChecked();
    expect(screen.getByTestId(`dedup-status-${T}`)).toHaveTextContent('Mỗi đợt cảnh báo chỉ gửi 1 lần');
    expect(screen.getByTestId(`dedup-audit-${T}`)).toHaveTextContent('Chưa từng thay đổi');
    expect(screen.getByTestId(`dedup-save-${T}`)).toBeDisabled();
  });

  it('TC-03: vai trò không phải Quản trị viên vẫn gọi API (để backend ghi nhật ký) và thấy trang từ chối khi nhận 403', async () => {
    vi.mocked(notificationsApi.getDedupConfigs).mockRejectedValue(
      new notificationsApi.NotificationsApiError('FORBIDDEN', 'Forbidden', 403)
    );
    render(<NotificationDedupConfigPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('dedup-access-denied')).toBeInTheDocument();
    expect(notificationsApi.getDedupConfigs).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/đã được ghi vào nhật ký hệ thống/)).toBeInTheDocument();
    expect(screen.queryByTestId(`dedup-card-${T}`)).not.toBeInTheDocument();
  });

  it('TC-04: đặt nhắc lại sau 24 giờ rồi lưu gửi đúng payload và hiện người cập nhật/thời điểm từ máy chủ', async () => {
    vi.mocked(notificationsApi.getDedupConfigs)
      .mockResolvedValueOnce([DEFAULT_CONFIG])
      .mockResolvedValue([
        { ...DEFAULT_CONFIG, cooldownHours: 24, updatedBy: 'admin', updatedAt: '2026-09-26T09:30:00' },
      ]);
    render(<NotificationDedupConfigPage currentUserRoles={['VT-07']} />);

    fireEvent.click(await screen.findByTestId(`dedup-mode-hours-${T}`));
    expect(screen.getByTestId(`dedup-status-${T}`)).toHaveTextContent('nhắc lại sau mỗi 24 giờ');
    fireEvent.click(screen.getByTestId(`dedup-save-${T}`));

    await waitFor(() =>
      expect(notificationsApi.updateDedupConfig).toHaveBeenCalledWith(T, { dedupEnabled: true, cooldownHours: 24 })
    );
    expect(await screen.findByText(/Đã lưu cấu hình chống gửi trùng/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId(`dedup-audit-${T}`)).toHaveTextContent('Cập nhật lần cuối bởi admin'));
    expect(screen.getByTestId(`dedup-save-${T}`)).toBeDisabled();
  });

  it('số giờ không hợp lệ thì báo lỗi ngay trên ô và không gọi API', async () => {
    render(<NotificationDedupConfigPage currentUserRoles={['VT-07']} />);
    fireEvent.click(await screen.findByTestId(`dedup-mode-hours-${T}`));
    fireEvent.change(screen.getByTestId(`dedup-hours-${T}`), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId(`dedup-save-${T}`));

    expect(await screen.findByTestId(`dedup-error-${T}`)).toHaveTextContent('Số giờ phải từ 1 trở lên.');
    expect(screen.getByTestId(`dedup-hours-${T}`)).toHaveAttribute('aria-invalid', 'true');
    expect(notificationsApi.updateDedupConfig).not.toHaveBeenCalled();
  });

  it('tắt chống trùng phải xác nhận thêm một bước; "Giữ chống trùng" không gọi API', async () => {
    render(<NotificationDedupConfigPage currentUserRoles={['VT-07']} />);
    fireEvent.click(await screen.findByTestId(`dedup-switch-${T}`));

    expect(screen.getByTestId(`dedup-off-warning-${T}`)).toBeInTheDocument();
    expect(screen.getByTestId(`dedup-mode-none-${T}`)).toBeDisabled();
    fireEvent.click(screen.getByTestId(`dedup-save-${T}`));

    expect(screen.getByText('Xác nhận tắt chống gửi trùng?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Giữ chống trùng'));
    expect(notificationsApi.updateDedupConfig).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId(`dedup-save-${T}`));
    fireEvent.click(screen.getByTestId(`dedup-confirm-disable-${T}`));
    await waitFor(() =>
      expect(notificationsApi.updateDedupConfig).toHaveBeenCalledWith(T, { dedupEnabled: false, cooldownHours: null })
    );
  });

  it('"Hoàn tác" trả về cấu hình đã lưu', async () => {
    render(<NotificationDedupConfigPage currentUserRoles={['VT-07']} />);
    fireEvent.click(await screen.findByTestId(`dedup-switch-${T}`));
    fireEvent.click(screen.getByTestId(`dedup-reset-${T}`));

    expect(screen.getByTestId(`dedup-switch-${T}`)).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId(`dedup-save-${T}`)).toBeDisabled();
  });

  it('lưu lỗi 400 thì hiện thông báo lỗi và giữ nguyên lựa chọn', async () => {
    vi.mocked(notificationsApi.updateDedupConfig).mockRejectedValue(
      new notificationsApi.NotificationsApiError('VALIDATION_ERROR', 'cooldownHours phai >= 1', 400)
    );
    render(<NotificationDedupConfigPage currentUserRoles={['VT-07']} />);
    fireEvent.click(await screen.findByTestId(`dedup-mode-hours-${T}`));
    fireEvent.click(screen.getByTestId(`dedup-save-${T}`));

    expect(await screen.findByText('cooldownHours phai >= 1')).toBeInTheDocument();
    expect(screen.getByTestId(`dedup-mode-hours-${T}`)).toBeChecked();
    expect(screen.getByTestId(`dedup-save-${T}`)).toBeEnabled();
  });

  it('mất quyền khi đang lưu (403) thì chuyển sang trang từ chối', async () => {
    vi.mocked(notificationsApi.updateDedupConfig).mockRejectedValue(
      new notificationsApi.NotificationsApiError('FORBIDDEN', 'Forbidden', 403)
    );
    render(<NotificationDedupConfigPage currentUserRoles={['VT-07']} />);
    fireEvent.click(await screen.findByTestId(`dedup-mode-hours-${T}`));
    fireEvent.click(screen.getByTestId(`dedup-save-${T}`));

    expect(await screen.findByTestId('dedup-access-denied')).toBeInTheDocument();
  });

  it('nút "Nhật ký hệ thống" mở nhật ký để tra lịch sử thay đổi', async () => {
    const onViewAuditLog = vi.fn();
    render(<NotificationDedupConfigPage currentUserRoles={['VT-07']} onViewAuditLog={onViewAuditLog} />);
    fireEvent.click(await screen.findByTestId('btn-dedup-audit-log'));
    expect(onViewAuditLog).toHaveBeenCalledTimes(1);
  });

  it('validateCooldown khớp ràng buộc backend (≥ 1, số nguyên)', () => {
    expect(validateCooldown('NONE', '')).toBeNull();
    expect(validateCooldown('HOURS', '')).toMatch(/Nhập số giờ/);
    expect(validateCooldown('HOURS', '1.5')).toMatch(/số nguyên/);
    expect(validateCooldown('HOURS', '0')).toMatch(/từ 1/);
    expect(validateCooldown('HOURS', '9999')).toMatch(/tối đa/);
    expect(validateCooldown('HOURS', '12')).toBeNull();
  });
});
