export type UserStatus = 'ACTIVE' | 'LOCKED' | 'INACTIVE';

export type ScopeType = 'COMPANY' | 'DEPARTMENT' | 'SELF' | 'PERSONAL';

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  departmentId: number | null;
  status: UserStatus;
  roleCodes: string[];
  scopeType?: ScopeType | null;
  scopeDepartmentId?: number | null;
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
  scopeDepartmentId?: number | null;
}

export interface UpdateUserPayload {
  fullName: string;
  email?: string | null;
  departmentId?: number | null;
  password?: string;
  roleCodes?: string[];
  scopeType?: ScopeType;
  scopeDepartmentId?: number | null;
}

export interface UserStatusPayload {
  status: UserStatus;
}

export interface RoleInfo {
  code: string;
  name: string;
  description: string;
  badgeClass: string;
  capabilities?: string[];
}

export interface RoleItem {
  id: number;
  code: string;
  name: string;
  description: string;
}

export interface DepartmentInfo {
  id: number;
  name: string;
  code?: string;
  parentId?: number | null;
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
  {
    code: 'VT-01',
    name: 'Ban giám đốc',
    description: 'Theo dõi tổng quan tài chính, doanh thu, lợi nhuận và hiệu suất toàn công ty',
    badgeClass: 'badge--gold',
    capabilities: ['Xem báo cáo toàn công ty', 'Xem cơ hội & hợp đồng', 'Xem KPI & tỷ suất lợi nhuận', 'Xem chấm công & bảng lương'],
  },
  {
    code: 'VT-02',
    name: 'Quản lý dự án (PM)',
    description: 'Quản lý tiến độ dự án, phân công nhiệm vụ, quản lý chi phí & phê duyệt chấm công',
    badgeClass: 'badge--blue',
    capabilities: ['Tạo & quản lý dự án', 'Giao việc cho nhân sự', 'Phê duyệt Timesheet', 'Theo dõi ngân sách & tiến độ'],
  },
  {
    code: 'VT-03',
    name: 'Nhân viên chuyên môn',
    description: 'Thực hiện nhiệm vụ chuyên môn, ghi nhận thời gian làm việc & nộp bảng chấm công',
    badgeClass: 'badge--green',
    capabilities: ['Xem nhiệm vụ được giao', 'Ghi nhận Timesheet hàng tuần', 'Nộp bảng chấm công', 'Xem thông tin cá nhân'],
  },
  {
    code: 'VT-04',
    name: 'Nhân viên kinh doanh',
    description: 'Quản lý danh sách khách hàng, cơ hội bán hàng, lập báo giá và hợp đồng',
    badgeClass: 'badge--orange',
    capabilities: ['Quản lý khách hàng (CRM)', 'Tạo & theo dõi cơ hội', 'Lập báo giá (Quote)', 'Ký kết hợp đồng'],
  },
  {
    code: 'VT-05',
    name: 'Kế toán',
    description: 'Lập hóa đơn thanh toán, ghi nhận công nợ, chi phí dự án và dòng tiền',
    badgeClass: 'badge--teal',
    capabilities: ['Lập & gửi hóa đơn (Invoice)', 'Ghi nhận thanh toán', 'Quản lý công nợ phải thu', 'Tính toán chi phí overhead'],
  },
  {
    code: 'VT-06',
    name: 'Nhân sự (HR)',
    description: 'Quản lý hồ sơ nhân sự, hợp đồng lao động, chi phí lương và ngày nghỉ lễ',
    badgeClass: 'badge--pink',
    capabilities: ['Quản lý hồ sơ nhân viên', 'Cấu hình chi phí lương (Cost Rate)', 'Quản lý hợp đồng lao động', 'Quản lý ngày nghỉ'],
  },
  {
    code: 'VT-07',
    name: 'Quản trị viên',
    description: 'Toàn quyền quản trị hệ thống, quản lý tài khoản người dùng, cây tổ chức và phân quyền',
    badgeClass: 'badge--purple',
    capabilities: ['Quản lý tài khoản người dùng', 'Khai báo cây tổ chức', 'Phân quyền & phạm vi dữ liệu', 'Cấu hình hệ thống & Audit Log'],
  },
  {
    code: 'VT-08',
    name: 'Nhân viên công ty',
    description: 'Nhân viên thông thường thao tác các chức năng dùng chung của hệ thống',
    badgeClass: 'badge--gray',
    capabilities: ['Xem thông báo hệ thống', 'Tra cứu danh bạ nội bộ', 'Cập nhật thông tin cá nhân'],
  },
  {
    code: 'VT-09',
    name: 'Khách hàng',
    description: 'Cổng thông tin khách hàng (Portal) tra cứu tiến độ dự án, nghiệm thu và hóa đơn',
    badgeClass: 'badge--indigo',
    capabilities: ['Cổng Portal khách hàng', 'Xem tiến độ nghiệm thu', 'Tra cứu hóa đơn & thanh toán'],
  },
];

// Phải khớp cây tổ chức seed ở backend: db/seed/R__seed_departments.sql
// Một cây thống nhất quy về Ban Giám Đốc; Trung tâm Công nghệ (id 6) có 3 Tổ/Nhóm con (7-9)
// là nơi bố trí lực lượng "Nhân viên chuyên môn" (VT-03).
export const SYSTEM_DEPARTMENTS: DepartmentInfo[] = [
  { id: 1, name: 'Ban Giám Đốc', code: 'BGD', parentId: null },
  { id: 2, name: 'Phòng Quản Lý Dự Án (PMO)', code: 'PMO', parentId: 1 },
  { id: 3, name: 'Phòng Kinh Doanh & Phát Triển Thị Trường', code: 'KDH', parentId: 1 },
  { id: 4, name: 'Phòng Kế Toán - Tài Chính', code: 'KTT', parentId: 1 },
  { id: 5, name: 'Phòng Nhân Sự', code: 'NSU', parentId: 1 },
  { id: 6, name: 'Trung Tâm Công Nghệ & Giải Pháp', code: 'TCN', parentId: 1 },
  { id: 7, name: 'Nhóm Phát Triển Phần Mềm', code: 'TCN-DEV', parentId: 6 },
  { id: 8, name: 'Nhóm Tư Vấn Giải Pháp', code: 'TCN-CS', parentId: 6 },
  { id: 9, name: 'Nhóm Kiểm Thử & Đảm Bảo Chất Lượng', code: 'TCN-QA', parentId: 6 },
];
