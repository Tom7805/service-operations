/**
 * NCL-13-CN-001 — Cấp tài khoản cổng cho khách hàng (màn hình quản trị, chỉ VT-07).
 * Khớp `PortalAccountRes`, `PortalContactCandidateRes` và các request của `/portal-accounts/**`.
 */

/** Trạng thái đăng nhập đọc trực tiếp từ tài khoản (`users.status`) — cổng chỉ dùng ACTIVE/LOCKED. */
export type PortalAccountStatus = 'ACTIVE' | 'LOCKED';

export type ContactRole = 'PRIMARY' | 'SECONDARY';

export interface PortalAccountRes {
  id: number;
  userId: number;
  username: string;
  fullName: string;
  email: string | null;
  status: PortalAccountStatus | string;
  customerId: number;
  customerCode: string | null;
  customerName: string | null;
  contactId: number;
  contactName: string | null;
  contactTitle: string | null;
  contactRole: ContactRole | null;
  statusReason: string | null;
  statusChangedBy: string | null;
  statusChangedAt: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

/** Người liên hệ của khách hàng kèm tài khoản cổng đã cấp (nếu có). Đầu mối chính đứng đầu. */
export interface PortalContactCandidateRes {
  contactId: number;
  fullName: string;
  title: string | null;
  email: string | null;
  role: ContactRole | null;
  portalAccountId: number | null;
  portalUsername: string | null;
  portalStatus: PortalAccountStatus | string | null;
}

export interface PortalAccountCreateReq {
  contactId: number;
  username: string;
  password: string;
}

export interface PortalAccountStatusReq {
  status: PortalAccountStatus;
  reason?: string | null;
}

export interface PortalAccountSearchParams {
  customerId?: number | null;
  status?: PortalAccountStatus | null;
}

export const PORTAL_STATUS_LABEL: Record<PortalAccountStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  LOCKED: 'Đã khóa',
};

export const CONTACT_ROLE_LABEL: Record<ContactRole, string> = {
  PRIMARY: 'Đầu mối chính',
  SECONDARY: 'Liên hệ phụ',
};

/** Các thao tác quản trị trên tài khoản cổng được backend ghi vào Nhật ký hệ thống (`targetType = PORTAL`). */
export const PORTAL_ACCOUNT_AUDIT_ACTIONS = [
  'Cấp tài khoản cổng khách hàng',
  'Khóa tài khoản cổng khách hàng',
  'Mở khóa tài khoản cổng khách hàng',
] as const;

/** Lượt bị từ chối (TC-03) do `AccessDeniedAuditRecorder` ghi: action + tên chức năng ở `targetLabel`. */
export const PORTAL_ACCESS_DENIED_ACTION = 'Từ chối truy cập';
export const PORTAL_ACCOUNT_FEATURE_LABEL = 'Cấp tài khoản cổng khách hàng';

export const PORTAL_USERNAME_MIN = 3;
export const PORTAL_USERNAME_MAX = 100;
export const PORTAL_PASSWORD_MIN = 8;
export const PORTAL_PASSWORD_MAX = 100;
export const PORTAL_REASON_MAX = 500;
