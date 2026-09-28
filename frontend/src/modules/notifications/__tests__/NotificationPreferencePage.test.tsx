import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationPreferencePage, { changedPreferences } from '../pages/NotificationPreferencePage';
import * as notificationsApi from '../api/notificationsApi';
import type { NotificationPreference } from '../types/notificationTypes';

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
    getNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
    NotificationsApiError: MockNotificationsApiError,
  };
});

const DEFAULTS: NotificationPreference[] = (
  ['TIMESHEET', 'EXPENSE', 'PROJECT', 'CONTRACT', 'INVOICE', 'ACCEPTANCE'] as const
).map((g) => ({ notificationGroup: g, enabled: true, frequency: 'IMMEDIATE' }));

function withPref(group: NotificationPreference['notificationGroup'], patch: Partial<NotificationPreference>) {
  return DEFAULTS.map((p) => (p.notificationGroup === group ? { ...p, ...patch } : p));
}

describe('NotificationPreferencePage (NCL-14-CN-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.getNotificationPreferences).mockResolvedValue(DEFAULTS);
    vi.mocked(notificationsApi.updateNotificationPreferences).mockResolvedValue(undefined);
  });

  it('hiển thị đủ 6 nhóm với trạng thái đã lưu trên máy chủ', async () => {
    vi.mocked(notificationsApi.getNotificationPreferences).mockResolvedValue(
      withPref('INVOICE', { enabled: false })
    );
    render(<NotificationPreferencePage />);

    expect(await screen.findByTestId('pref-row-TIMESHEET')).toBeInTheDocument();
    for (const g of ['EXPENSE', 'PROJECT', 'CONTRACT', 'INVOICE', 'ACCEPTANCE']) {
      expect(screen.getByTestId(`pref-row-${g}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('pref-switch-INVOICE')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('pref-switch-TIMESHEET')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('pref-summary')).toHaveTextContent('1 nhóm đang tắt');
    // Chưa đổi gì thì không cho lưu.
    expect(screen.getByTestId('btn-pref-save')).toBeDisabled();
  });

  it('TC-01: tắt nhóm Dự án rồi lưu thì chỉ gửi nhóm đó với enabled=false', async () => {
    render(<NotificationPreferencePage />);
    fireEvent.click(await screen.findByTestId('pref-switch-PROJECT'));

    expect(screen.getByTestId('pref-switch-PROJECT')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('pref-dirty-PROJECT')).toBeInTheDocument();
    // Nhóm tắt thì khóa chọn tần suất.
    expect(screen.getByTestId('pref-freq-PROJECT-DAILY_DIGEST')).toBeDisabled();
    expect(screen.getByTestId('pref-note-PROJECT')).toHaveTextContent('không nhận thông báo mới');

    fireEvent.click(screen.getByTestId('btn-pref-save'));

    await waitFor(() =>
      expect(notificationsApi.updateNotificationPreferences).toHaveBeenCalledWith([
        { notificationGroup: 'PROJECT', enabled: false, frequency: 'IMMEDIATE' },
      ])
    );
    expect(await screen.findByText(/Đã lưu cấu hình nhận thông báo \(1 nhóm: Dự án\)/)).toBeInTheDocument();
    expect(screen.queryByTestId('pref-dirty-PROJECT')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-pref-save')).toBeDisabled();
    expect(screen.getByTestId('pref-status')).toHaveTextContent('Đã lưu lúc');
  });

  it('TC-02: chọn "Tổng hợp cuối ngày" cho nhóm Hóa đơn gửi frequency=DAILY_DIGEST', async () => {
    render(<NotificationPreferencePage />);
    fireEvent.click(await screen.findByTestId('pref-freq-INVOICE-DAILY_DIGEST'));

    expect(screen.getByTestId('pref-note-INVOICE')).toHaveTextContent('20:00');
    expect(screen.getByTestId('pref-summary')).toHaveTextContent('1 nhóm tổng hợp cuối ngày');

    fireEvent.click(screen.getByTestId('btn-pref-save'));

    await waitFor(() =>
      expect(notificationsApi.updateNotificationPreferences).toHaveBeenCalledWith([
        { notificationGroup: 'INVOICE', enabled: true, frequency: 'DAILY_DIGEST' },
      ])
    );
  });

  it('"Hoàn tác" trả về cấu hình đã lưu, không gọi API', async () => {
    render(<NotificationPreferencePage />);
    fireEvent.click(await screen.findByTestId('pref-switch-EXPENSE'));
    expect(screen.getByTestId('pref-status')).toHaveTextContent('Có 1 nhóm thay đổi chưa lưu');

    fireEvent.click(screen.getByTestId('btn-pref-reset'));

    expect(screen.getByTestId('pref-switch-EXPENSE')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('pref-status')).toHaveTextContent('Không có thay đổi');
    expect(notificationsApi.updateNotificationPreferences).not.toHaveBeenCalled();
  });

  it('"Khôi phục mặc định" bật lại mọi nhóm và đặt nhận ngay', async () => {
    vi.mocked(notificationsApi.getNotificationPreferences).mockResolvedValue([
      ...withPref('INVOICE', { enabled: false }).slice(0, 5),
      { notificationGroup: 'ACCEPTANCE', enabled: true, frequency: 'DAILY_DIGEST' },
    ]);
    render(<NotificationPreferencePage />);
    fireEvent.click(await screen.findByTestId('btn-pref-defaults'));
    fireEvent.click(screen.getByTestId('btn-pref-save'));

    await waitFor(() =>
      expect(notificationsApi.updateNotificationPreferences).toHaveBeenCalledWith([
        { notificationGroup: 'INVOICE', enabled: true, frequency: 'IMMEDIATE' },
        { notificationGroup: 'ACCEPTANCE', enabled: true, frequency: 'IMMEDIATE' },
      ])
    );
  });

  it('lưu thất bại thì báo lỗi và giữ nguyên thay đổi chưa lưu để thử lại', async () => {
    vi.mocked(notificationsApi.updateNotificationPreferences).mockRejectedValue(
      new notificationsApi.NotificationsApiError('VALIDATION_ERROR', 'Du lieu khong hop le', 400)
    );
    render(<NotificationPreferencePage />);
    fireEvent.click(await screen.findByTestId('pref-switch-CONTRACT'));
    fireEvent.click(screen.getByTestId('btn-pref-save'));

    expect(await screen.findByText('Du lieu khong hop le')).toBeInTheDocument();
    expect(screen.getByTestId('pref-switch-CONTRACT')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('btn-pref-save')).toBeEnabled();
  });

  it('tải cấu hình thất bại thì hiện lỗi và "Thử lại" gọi lại API', async () => {
    vi.mocked(notificationsApi.getNotificationPreferences)
      .mockRejectedValueOnce(new notificationsApi.NotificationsApiError('NETWORK_ERROR', 'Không thể kết nối', 503))
      .mockResolvedValueOnce(DEFAULTS);
    render(<NotificationPreferencePage />);

    expect(await screen.findByText('Không thể kết nối')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-pref-retry'));

    expect(await screen.findByTestId('pref-row-TIMESHEET')).toBeInTheDocument();
  });

  it('quay lại khi còn thay đổi chưa lưu thì hỏi xác nhận', async () => {
    const onBack = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<NotificationPreferencePage onBack={onBack} />);
    fireEvent.click(await screen.findByTestId('pref-switch-TIMESHEET'));

    fireEvent.click(screen.getByTestId('btn-pref-back'));
    expect(onBack).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('btn-pref-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });

  it('changedPreferences chỉ trả các nhóm khác bản đã lưu', () => {
    const draft = withPref('PROJECT', { frequency: 'DAILY_DIGEST' });
    expect(changedPreferences(draft, DEFAULTS)).toEqual([
      { notificationGroup: 'PROJECT', enabled: true, frequency: 'DAILY_DIGEST' },
    ]);
    expect(changedPreferences(DEFAULTS, DEFAULTS)).toEqual([]);
  });
});
