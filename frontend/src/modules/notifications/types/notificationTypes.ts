/** Khớp enum NotificationType phía backend. */
export type NotificationType =
  | 'TIMESHEET_SUBMITTED'
  | 'TIMESHEET_REJECTED'
  | 'TIMER_AUTO_STOPPED'
  | 'TIMESHEET_REMINDER'
  | 'EXPENSE_SUBMITTED'
  | 'PROJECT_MILESTONE_DUE'
  | 'CONTRACT_EXPIRING'
  | 'NEGATIVE_MARGIN_ALERT'
  | 'INVOICE_PROPOSAL_CREATED'
  | 'DUNNING_REMINDER'
  | 'RECURRING_INVOICE_GENERATED'
  | 'ACCEPTANCE_DECIDED_ON_PORTAL'
  | 'DAILY_DIGEST_SUMMARY'
  | 'TASK_BUDGET_EXCEEDED'
  /** NCL-01-CN-009-TC-02: cảnh báo bảo mật gửi quản trị viên (tài khoản bị tạm khóa do sai mã 2FA). */
  | 'SECURITY_ALERT';

/** Khớp enum NotificationChannel phía backend — hiện chỉ IN_APP thực sự gửi được. */
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';

/**
 * Khớp enum NotificationTargetType phía backend — loại bản ghi để điều hướng khi mở một
 * thông báo (NCL-14-CN-001 TC-02). Suy ra từ `type`, không phải từ `referenceType` (vốn ở một số
 * loại thông báo là khóa chống gửi trùng QTN-27 chứ không phải tên loại bản ghi).
 */
export type NotificationTargetType =
  | 'TIMESHEET'
  | 'TASK'
  | 'PROJECT'
  | 'INVOICE'
  | 'INVOICE_PROPOSAL'
  | 'ACCEPTANCE_CERTIFICATE'
  | 'EXPENSE'
  | 'CONTRACT'
  | 'NONE';

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
  targetType: NotificationTargetType;
  isRead: boolean;
  readAt: string | null;
  sentAt: string;
}
