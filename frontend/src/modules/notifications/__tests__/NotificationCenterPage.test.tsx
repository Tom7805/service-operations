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
    markAllNotificationsRead: vi.fn(),
    openNotification: vi.fn(),
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
    referenceId: 7,
    referenceType: null,
    targetType: 'TIMESHEET',
    isRead: false,
    readAt: null,
    sentAt: '2026-09-13T20:00:00',
    severity: 'WARNING',
    notificationGroup: 'TIMESHEET',
    ...overrides,
  };
}

const FIVE_UNREAD = [1, 2, 3, 4, 5].map((id) => notif({ id, title: `Thông báo ${id}` }));

describe('NotificationCenterPage (NCL-14-CN-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(0);
  });

  it('tải và hiển thị danh sách thông báo mặc định (Tất cả, mọi nhóm)', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([notif()]);

    render(<NotificationCenterPage />);

    expect(await screen.findByText('Nhắc nộp bảng chấm công')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledWith(false, 0, 20, null);
  });

  it('TC-01: năm thông báo chưa đọc hiển thị kèm dấu chưa đọc, số đếm lấy từ unread-count và đồng bộ lên chuông', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue(FIVE_UNREAD);
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(5);
    const onUnreadCountChange = vi.fn();

    render(<NotificationCenterPage onUnreadCountChange={onUnreadCountChange} />);

    await screen.findByText('Thông báo 5');
    for (const n of FIVE_UNREAD) {
      expect(screen.getByTestId(`notification-unread-dot-${n.id}`)).toBeInTheDocument();
    }
    await waitFor(() => expect(screen.getByTestId('notif-center-unread-count')).toHaveTextContent('5 CHƯA ĐỌC'));
    expect(onUnreadCountChange).toHaveBeenCalledWith(5);
  });

  it('chuyển tab "Chưa đọc" thì gọi API với unreadOnly=true', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([]);

    render(<NotificationCenterPage />);
    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenCalledWith(false, 0, 20, null));

    fireEvent.click(screen.getByTestId('tab-unread'));

    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenCalledWith(true, 0, 20, null));
  });

  it('lọc theo nhóm gửi tham số group tương ứng và "Bỏ lọc" trả về mọi nhóm', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([]);

    render(<NotificationCenterPage />);
    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTestId('group-filter-PROJECT'));
    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenLastCalledWith(false, 0, 20, 'PROJECT'));
    expect(screen.getByText('Chưa có thông báo nào trong nhóm này')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-clear-filter'));
    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenLastCalledWith(false, 0, 20, null));
  });

  it('TC-02: bấm thông báo vượt ngân sách thì gọi /open, đánh dấu đã đọc và chuyển tới bản ghi', async () => {
    const budget = notif({
      id: 9,
      type: 'TASK_BUDGET_EXCEEDED',
      title: 'Cong viec vuot nguong ngan sach gio cong',
      targetType: 'TASK',
      referenceId: 55,
      severity: 'CRITICAL',
      notificationGroup: 'PROJECT',
    });
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([budget]);
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValueOnce(1).mockResolvedValue(0);
    const opened = { ...budget, isRead: true, readAt: '2026-09-25T09:12:00' };
    vi.mocked(notificationsApi.openNotification).mockResolvedValue(opened);
    const onNavigate = vi.fn();
    const onUnreadCountChange = vi.fn();

    render(<NotificationCenterPage onNavigate={onNavigate} onUnreadCountChange={onUnreadCountChange} />);
    fireEvent.click(await screen.findByTestId('notification-row-9'));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(opened));
    expect(notificationsApi.openNotification).toHaveBeenCalledWith(9);
    // Không dùng /read cho thao tác mở — /open mới ghi nhật ký "Mo thong bao" (TC-03).
    expect(notificationsApi.markNotificationsRead).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('notification-row-9')).toHaveAttribute('data-read', 'true'));
    await waitFor(() => expect(onUnreadCountChange).toHaveBeenLastCalledWith(0));
  });

  it('mở thông báo đã bị xóa (404) thì báo lỗi và tải lại danh sách, không điều hướng', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([notif()]);
    vi.mocked(notificationsApi.openNotification).mockRejectedValue(
      new notificationsApi.NotificationsApiError('RESOURCE_NOT_FOUND', 'Not found', 404)
    );
    const onNavigate = vi.fn();

    render(<NotificationCenterPage onNavigate={onNavigate} />);
    fireEvent.click(await screen.findByTestId('notification-row-1'));

    expect(await screen.findByText(/không còn tồn tại/)).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2));
  });

  it('nút đánh dấu đã đọc trên một dòng gọi POST /notifications/read với đúng id', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([notif()]);
    vi.mocked(notificationsApi.markNotificationsRead).mockResolvedValue(undefined);

    render(<NotificationCenterPage />);
    fireEvent.click(await screen.findByTestId('btn-mark-read-1'));

    await waitFor(() => expect(notificationsApi.markNotificationsRead).toHaveBeenCalledWith([1]));
    expect(notificationsApi.openNotification).not.toHaveBeenCalled();
  });

  it('"Đánh dấu tất cả đã đọc" gọi POST /notifications/read-all và đưa số đếm về 0', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([
      notif({ id: 1 }),
      notif({ id: 2 }),
      notif({ id: 3, isRead: true }),
    ]);
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(2);
    vi.mocked(notificationsApi.markAllNotificationsRead).mockResolvedValue(2);
    const onUnreadCountChange = vi.fn();

    render(<NotificationCenterPage onUnreadCountChange={onUnreadCountChange} />);
    await screen.findByTestId('notification-row-1');
    await waitFor(() => expect(screen.getByTestId('btn-mark-all-read')).toBeEnabled());

    fireEvent.click(screen.getByTestId('btn-mark-all-read'));

    await waitFor(() => expect(notificationsApi.markAllNotificationsRead).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Đã đánh dấu 2 thông báo là đã đọc.')).toBeInTheDocument();
    expect(onUnreadCountChange).toHaveBeenLastCalledWith(0);
    expect(screen.getByTestId('notification-row-1')).toHaveAttribute('data-read', 'true');
  });

  it('vô hiệu hoá "Đánh dấu tất cả đã đọc" khi không còn thông báo chưa đọc', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([notif({ isRead: true })]);
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(0);

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
