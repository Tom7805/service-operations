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

/** Mức độ của thông báo (NCL-14-CN-001) — suy ra từ `type` phía backend. */
export type NotificationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

/**
 * Nhóm thông báo (NCL-14-CN-001) — dùng cho bộ lọc `group` của `GET /notifications`.
 * `null` với `DAILY_DIGEST_SUMMARY` và `SECURITY_ALERT`.
 */
export type NotificationGroup = 'TIMESHEET' | 'EXPENSE' | 'PROJECT' | 'CONTRACT' | 'INVOICE' | 'ACCEPTANCE';

/**
 * Tần suất nhận của một nhóm (NCL-14-CN-002): nhận ngay, hoặc gộp thành một bản tổng hợp
 * (`DAILY_DIGEST_SUMMARY`) tạo lúc 20:00 mỗi ngày.
 */
export type NotificationFrequency = 'IMMEDIATE' | 'DAILY_DIGEST';

/**
 * Cấu hình nhận của một nhóm thông báo — khớp NotificationPreferenceRes và từng phần tử
 * `preferences` của PUT /notifications/preferences. GET luôn trả đủ 6 nhóm.
 */
export interface NotificationPreference {
  notificationGroup: NotificationGroup;
  enabled: boolean;
  frequency: NotificationFrequency;
}

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
  /** Bổ sung ở NCL-14-CN-001 — để tùy chọn vì dữ liệu mô phỏng cũ có thể chưa có. */
  severity?: NotificationSeverity;
  notificationGroup?: NotificationGroup | null;
}

/**
 * Cấu hình chống gửi trùng của một loại sự kiện (NCL-14-CN-003, QTN-27) — khớp
 * NotificationDedupConfigRes. Chỉ Quản trị viên (VT-07) đọc/ghi được.
 * - `dedupEnabled = false`: luôn gửi, không chiếm khóa chống trùng.
 * - `cooldownHours`: số giờ tối thiểu giữa 2 lần nhắc trong cùng một đợt cảnh báo; `null` = không
 *   nhắc lại trong đợt (chỉ gửi lại khi bản ghi thoát rồi vượt ngưỡng lần nữa).
 * - `updatedBy`/`updatedAt`: `null` nếu loại sự kiện chưa từng được cấu hình riêng (đang dùng mặc định).
 */
export interface NotificationDedupConfig {
  eventType: NotificationType;
  dedupEnabled: boolean;
  cooldownHours: number | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

/** Payload PUT /notifications/dedup-configs/{eventType}. */
export interface NotificationDedupConfigReq {
  dedupEnabled: boolean;
  cooldownHours: number | null;
}
