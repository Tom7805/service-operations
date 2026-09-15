/** Khớp enum NotificationType phía backend. */
export type NotificationType =
  | 'TIMESHEET_SUBMITTED'
  | 'TIMESHEET_REMINDER'
  | 'EXPENSE_SUBMITTED'
  | 'PROJECT_MILESTONE_DUE'
  | 'CONTRACT_EXPIRING';

/** Khớp enum NotificationChannel phía backend — hiện chỉ IN_APP thực sự gửi được. */
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';

/**
 * Một thông báo in-app của chính người dùng hiện tại. Khớp NotificationRes —
 * `GET /notifications` luôn chỉ trả thông báo của chính mình, không nhận `recipientId` từ client.
 */
export interface NotificationRes {
  id: number;
  recipientId: number;
  type: NotificationType;
  title: string;
  content: string;
  channel: NotificationChannel;
  referenceId: number | null;
  referenceType: string | null;
  isRead: boolean;
  readAt: string | null;
  sentAt: string;
}
