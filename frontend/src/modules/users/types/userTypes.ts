export type UserStatus = 'ACTIVE' | 'LOCKED' | 'INACTIVE';

export type ScopeType = 'COMPANY' | 'DEPARTMENT' | 'PERSONAL';

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  departmentId: number | null;
  status: UserStatus;
  roleCodes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  email?: string | null;
  departmentId?: number | null;
  roleCodes: string[];
  scopeType?: ScopeType;
}

export interface UpdateUserPayload {
  fullName: string;
  email?: string | null;
  departmentId?: number | null;
  password?: string;
  roleCodes?: string[];
  scopeType?: ScopeType;
}

export interface UserStatusPayload {
  status: UserStatus;
}

export interface RoleInfo {
  code: string;
  name: string;
  description: string;
  badgeClass: string;
}

export interface DepartmentInfo {
  id: number;
  name: string;
  code: string;
}

export interface UserAuditLog {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  targetUser: string;
  details: string;
}

export const SYSTEM_ROLES: RoleInfo[] = [
  { code: 'VT-01', name: 'Ban giám đốc', description: 'Theo dõi tổng quan tài chính và hiệu suất toàn công ty', badgeClass: 'badge--gold' },
  { code: 'VT-02', name: 'Quản lý dự án', description: 'Quản lý dự án, giao việc, duyệt chấm công', badgeClass: 'badge--blue' },
  { code: 'VT-03', name: 'Nhân viên chuyên môn', description: 'Thực hiện công việc và nộp bảng chấm công', badgeClass: 'badge--green' },
  { code: 'VT-04', name: 'Nhân viên kinh doanh', description: 'Quản lý khách hàng, cơ hội và báo giá', badgeClass: 'badge--orange' },
  { code: 'VT-05', name: 'Kế toán', description: 'Lập hóa đơn, ghi nhận thanh toán và chi phí', badgeClass: 'badge--teal' },
  { code: 'VT-06', name: 'Nhân sự', description: 'Quản lý hồ sơ nhân sự và chi phí lương', badgeClass: 'badge--pink' },
  { code: 'VT-07', name: 'Quản trị viên', description: 'Quản trị hệ thống, tài khoản và phân quyền', badgeClass: 'badge--purple' },
  { code: 'VT-08', name: 'Nhân viên công ty', description: 'Thao tác các chức năng chung của hệ thống', badgeClass: 'badge--gray' },
  { code: 'VT-09', name: 'Khách hàng', description: 'Cổng tra cứu tiến độ, nghiệm thu và hóa đơn', badgeClass: 'badge--indigo' },
];

export const SYSTEM_DEPARTMENTS: DepartmentInfo[] = [
  { id: 1, name: 'Ban Giám Đốc', code: 'BGD' },
  { id: 2, name: 'Phòng Quản Lý Dự Án (PMO)', code: 'PMO' },
  { id: 3, name: 'Phòng Kinh Doanh & Phát Triển Thị Trường', code: 'KDH' },
  { id: 4, name: 'Phòng Kế Toán - Tài Chính', code: 'KTT' },
  { id: 5, name: 'Phòng Nhân Sự', code: 'NSU' },
  { id: 6, name: 'Trung Tâm Công Nghệ & Giải Pháp', code: 'TCN' },
];
