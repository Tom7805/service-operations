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
  referenceId: 7,
  referenceType: null,
  targetType: 'TIMESHEET',
  isRead: false,
  readAt: null,
  sentAt: new Date().toISOString(),
  severity: 'WARNING',
  notificationGroup: 'TIMESHEET',
};

const READ: NotificationRes = {
  ...UNREAD,
  id: 2,
  isRead: true,
  readAt: new Date().toISOString(),
  title: 'Bảng chấm công mới cần duyệt',
  type: 'TIMESHEET_SUBMITTED',
};

const BUDGET: NotificationRes = {
  ...UNREAD,
  id: 3,
  type: 'TASK_BUDGET_EXCEEDED',
  title: 'Cong viec vuot nguong ngan sach gio cong',
  targetType: 'TASK',
  referenceId: 55,
  severity: 'CRITICAL',
  notificationGroup: 'PROJECT',
};

const DIGEST: NotificationRes = {
  ...UNREAD,
  id: 4,
  type: 'DAILY_DIGEST_SUMMARY',
  title: 'Tong hop thong bao hom nay',
  targetType: 'NONE',
  referenceId: null,
  severity: 'INFO',
  notificationGroup: null,
};

describe('NotificationList (NCL-14-CN-001)', () => {
  it('hiển thị trạng thái trống khi không có thông báo nào', () => {
    render(<NotificationList notifications={[]} onOpen={vi.fn()} />);
    expect(screen.getByText('Chưa có thông báo nào')).toBeInTheDocument();
  });

  it('hiển thị đúng tiêu đề, nội dung và mức độ của từng thông báo', () => {
    render(<NotificationList notifications={[UNREAD, BUDGET, DIGEST]} onOpen={vi.fn()} />);
    expect(screen.getByText('Nhắc nộp bảng chấm công')).toBeInTheDocument();
    expect(screen.getByText('Nghiêm trọng')).toBeInTheDocument();
    expect(screen.getByText('Cảnh báo')).toBeInTheDocument();
    expect(screen.getByText('Thông tin')).toBeInTheDocument();
  });

  it('TC-01: thông báo chưa đọc có dấu chưa đọc, đã đọc thì không', () => {
    render(<NotificationList notifications={[UNREAD, READ]} onOpen={vi.fn()} />);
    expect(screen.getByTestId('notification-unread-dot-1')).toBeInTheDocument();
    expect(screen.queryByTestId('notification-unread-dot-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('notification-row-1')).toHaveAttribute('data-read', 'false');
  });

  it('TC-02: bấm vào thông báo thì gọi onOpen — kể cả thông báo đã đọc để mở lại bản ghi', () => {
    const onOpen = vi.fn();
    render(<NotificationList notifications={[UNREAD, READ]} onOpen={onOpen} />);

    fireEvent.click(screen.getByTestId('notification-row-1'));
    fireEvent.click(screen.getByTestId('notification-row-2'));

    expect(onOpen).toHaveBeenNthCalledWith(1, UNREAD);
    expect(onOpen).toHaveBeenNthCalledWith(2, READ);
  });

  it('nút đánh dấu đã đọc chỉ hiện cho thông báo chưa đọc và không kích hoạt onOpen', () => {
    const onOpen = vi.fn();
    const onMarkRead = vi.fn();
    render(<NotificationList notifications={[UNREAD, READ]} onOpen={onOpen} onMarkRead={onMarkRead} />);

    expect(screen.queryByTestId('btn-mark-read-2')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-mark-read-1'));

    expect(onMarkRead).toHaveBeenCalledWith(UNREAD);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('chỉ gợi ý "Mở bản ghi liên quan" khi thông báo có đích điều hướng', () => {
    render(<NotificationList notifications={[BUDGET, DIGEST]} onOpen={vi.fn()} />);
    expect(screen.getAllByText('Mở bản ghi liên quan')).toHaveLength(1);
  });

  it('khóa dòng đang mở để tránh bấm liên tiếp', () => {
    render(<NotificationList notifications={[BUDGET]} onOpen={vi.fn()} openingId={3} />);
    expect(screen.getByTestId('notification-row-3')).toBeDisabled();
    expect(screen.getByText(/Đang mở/)).toBeInTheDocument();
  });
});
