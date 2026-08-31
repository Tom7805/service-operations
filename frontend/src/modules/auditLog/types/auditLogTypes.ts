export type SensitiveAccessAction = 'VIEW' | 'EXPORT' | 'DENIED';

export type SensitiveDataTypeCode = 'SALARY' | 'COST' | 'COST_OF_GOODS' | 'MARGIN';

export interface SensitiveAccessLogEntry {
  id: number;
  userId: number;
  username: string;
  action: SensitiveAccessAction;
  dataType: SensitiveDataTypeCode;
  targetId: number | null;
  targetRef: string | null;
  ipAddress: string | null;
  detail: string | null;
  accessedAt: string;
}

export interface SensitiveAccessLogPage {
  content: SensitiveAccessLogEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SensitiveAccessLogSearchParams {
  userId?: number;
  username?: string;
  dataType?: SensitiveDataTypeCode | '';
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export const ACCESS_ACTION_LABELS: Record<SensitiveAccessAction, string> = {
  VIEW: 'Xem',
  EXPORT: 'Xuất dữ liệu',
  DENIED: 'Bị từ chối',
};

export const DATA_TYPE_LABELS: Record<SensitiveDataTypeCode, string> = {
  SALARY: 'Lương',
  COST: 'Chi phí',
  COST_OF_GOODS: 'Giá vốn hàng bán',
  MARGIN: 'Biên lợi nhuận',
};

/** Nhật ký thao tác nghiệp vụ tổng hợp (Tài khoản, Phân quyền, 2FA...) — thay cho các ô "nhật ký"
 * nhúng tạm thời, chỉ lưu trên trình duyệt, đã dùng trước đây ở từng trang. */
export type AuditTargetType = 'USER' | 'ROLE_SCOPE' | 'TWO_FACTOR' | 'DEPARTMENT' | 'CUSTOMER' | 'MASKING' | 'GENERAL';

export interface AuditLogEntry {
  id: number;
  actorUserId: number | null;
  actorUsername: string | null;
  action: string;
  targetType: AuditTargetType;
  targetId: number | null;
  targetLabel: string | null;
  detail: string | null;
  performedAt: string;
}

export interface AuditLogPage {
  content: AuditLogEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuditLogSearchParams {
  actorUsername?: string;
  targetType?: AuditTargetType | '';
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export const TARGET_TYPE_LABELS: Record<AuditTargetType, string> = {
  USER: 'Tài khoản',
  ROLE_SCOPE: 'Vai trò & phạm vi',
  TWO_FACTOR: 'Xác thực hai bước',
  DEPARTMENT: 'Tổ chức',
  CUSTOMER: 'Khách hàng',
  MASKING: 'Che dữ liệu',
  GENERAL: 'Khác',
};
