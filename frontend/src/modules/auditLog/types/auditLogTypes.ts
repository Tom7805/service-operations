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
