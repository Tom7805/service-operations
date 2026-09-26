import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationCenterPage from '../pages/NotificationCenterPage';
import * as notificationsApi from '../api/notificationsApi';
import type { NotificationRes } from '../types/notificationTypes';

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
    getNotifications: vi.fn(),
    markNotificationsRead: vi.fn(),
    getUnreadCount: vi.fn(),
    NotificationsApiError: MockNotificationsApiError,
  };
});

function notif(overrides: Partial<NotificationRes> = {}): NotificationRes {
  return {
    id: 1,
    recipientId: 7,
    type: 'TIMESHEET_REMINDER',
    title: 'Nhắc nộp bảng chấm công',
    content: 'Bạn còn giờ công chưa nộp',
    channel: 'IN_APP',
    referenceId: null,
    referenceType: null,
    targetType: 'TIMESHEET',
    isRead: false,
    readAt: null,
    sentAt: '2026-09-13T20:00:00',
    ...overrides,
  };
}

describe('NotificationCenterPage (NCL-06-CN-009)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tải và hiển thị danh sách thông báo mặc định (Tất cả)', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([notif()]);

    render(<NotificationCenterPage />);

    expect(await screen.findByText('Nhắc nộp bảng chấm công')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledWith(false, 0, 20);
  });

  it('chuyển tab "Chưa đọc" thì gọi API với unreadOnly=true', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([]);

    render(<NotificationCenterPage />);
    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenCalledWith(false, 0, 20));

    fireEvent.click(screen.getByTestId('tab-unread'));

    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenCalledWith(true, 0, 20));
  });

  it('bấm vào một thông báo chưa đọc thì gọi markNotificationsRead', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([notif()]);
    vi.mocked(notificationsApi.markNotificationsRead).mockResolvedValue(undefined);

    render(<NotificationCenterPage />);
    fireEvent.click(await screen.findByTestId('notification-row-1'));

    await waitFor(() => expect(notificationsApi.markNotificationsRead).toHaveBeenCalledWith([1]));
  });

  it('"Đánh dấu tất cả đã đọc" gọi markNotificationsRead với mọi id chưa đọc', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([
      notif({ id: 1 }),
      notif({ id: 2 }),
      notif({ id: 3, isRead: true }),
    ]);
    vi.mocked(notificationsApi.markNotificationsRead).mockResolvedValue(undefined);

    render(<NotificationCenterPage />);
    await screen.findByTestId('notification-row-1');

    fireEvent.click(screen.getByTestId('btn-mark-all-read'));

    await waitFor(() => expect(notificationsApi.markNotificationsRead).toHaveBeenCalledWith([1, 2]));
  });

  it('vô hiệu hoá "Đánh dấu tất cả đã đọc" khi không còn thông báo chưa đọc', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([notif({ isRead: true })]);

    render(<NotificationCenterPage />);
    await screen.findByTestId('notification-row-1');

    expect(screen.getByTestId('btn-mark-all-read')).toBeDisabled();
  });

  it('hiển thị lỗi khi tải danh sách thất bại', async () => {
    vi.mocked(notificationsApi.getNotifications).mockRejectedValue(
      new notificationsApi.NotificationsApiError('UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn.', 401)
    );

    render(<NotificationCenterPage />);

    expect(await screen.findByText('Phiên đăng nhập đã hết hạn.')).toBeInTheDocument();
  });
});
