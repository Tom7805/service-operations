import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotificationList from '../components/NotificationList';
import type { NotificationRes } from '../types/notificationTypes';

const UNREAD: NotificationRes = {
  id: 1,
  recipientId: 7,
  type: 'TIMESHEET_REMINDER',
  title: 'Nhắc nộp bảng chấm công',
  content: 'Bạn còn giờ công chưa nộp trong tuần 07/09 - 13/09',
  channel: 'IN_APP',
  referenceId: null,
  referenceType: null,
  targetType: 'TIMESHEET',
  isRead: false,
  readAt: null,
  sentAt: new Date().toISOString(),
};

const READ: NotificationRes = {
  ...UNREAD,
  id: 2,
  isRead: true,
  readAt: new Date().toISOString(),
  title: 'Bảng chấm công mới cần duyệt',
  type: 'TIMESHEET_SUBMITTED',
};

describe('NotificationList (NCL-06-CN-009)', () => {
  it('hiển thị trạng thái trống khi không có thông báo nào', () => {
    render(<NotificationList notifications={[]} onMarkRead={vi.fn()} />);
    expect(screen.getByText('Chưa có thông báo nào')).toBeInTheDocument();
  });

  it('hiển thị đúng tiêu đề, nội dung của từng thông báo', () => {
    render(<NotificationList notifications={[UNREAD, READ]} onMarkRead={vi.fn()} />);
    expect(screen.getByText('Nhắc nộp bảng chấm công')).toBeInTheDocument();
    expect(screen.getByText('Bảng chấm công mới cần duyệt')).toBeInTheDocument();
  });

  it('bấm vào thông báo chưa đọc thì gọi onMarkRead', () => {
    const onMarkRead = vi.fn();
    render(<NotificationList notifications={[UNREAD]} onMarkRead={onMarkRead} />);

    fireEvent.click(screen.getByTestId('notification-row-1'));

    expect(onMarkRead).toHaveBeenCalledWith(UNREAD);
  });

  it('bấm vào thông báo đã đọc thì KHÔNG gọi onMarkRead lại', () => {
    const onMarkRead = vi.fn();
    render(<NotificationList notifications={[READ]} onMarkRead={onMarkRead} />);

    fireEvent.click(screen.getByTestId('notification-row-2'));

    expect(onMarkRead).not.toHaveBeenCalled();
  });
});
