export type EmploymentTypeCode = 'FULL_TIME' | 'PART_TIME';

export interface Employee {
  id: number;
  userId: number;
  username: string;
  fullName: string;
  departmentId: number | null;
  departmentName: string | null;
  professionalRole: string | null;
  level?: string | null;
  standardHoursPerWeek: number;
  hireDate: string;
  endDate: string | null;
}

/** Tài khoản trong hệ thống — dùng cho combobox trong form tạo hồ sơ nhân sự. */
export interface AssignableUser {
  id: number;
  username: string;
  fullName: string;
  /** true nếu tài khoản này đã có hồ sơ nhân sự (không cho chọn lại). */
  hasEmployeeProfile: boolean;
}

export interface EmploymentContract {
  id: number;
  employeeId: number;
  contractType: EmploymentTypeCode;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

export interface EmployeeDetail extends Employee {
  createdAt: string;
  updatedAt: string;
  contracts: EmploymentContract[];
}

export interface EmployeeCreatePayload {
  userId: number;
  departmentId?: number | null;
  professionalRole?: string | null;
  level?: string | null;
  hireDate: string;
  endDate?: string | null;
  standardHoursPerWeek?: number | null;
}

export interface EmployeeUpdatePayload {
  departmentId?: number | null;
  professionalRole?: string | null;
  level?: string | null;
  hireDate: string;
  endDate?: string | null;
  standardHoursPerWeek?: number | null;
}

export interface EmploymentContractCreatePayload {
  contractType: EmploymentTypeCode;
  startDate: string;
  endDate?: string | null;
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentTypeCode, string> = {
  FULL_TIME: 'Toàn thời gian',
  PART_TIME: 'Bán thời gian',
};

/** NCL-01-CN-007-TC-01/TC-02: mặc định của backend khi không truyền standardHoursPerWeek. */
export const DEFAULT_STANDARD_HOURS_PER_WEEK = 40;

/**
 * NCL-07-CN-004 — Khai báo chi phí giờ công nội bộ. Mỗi mốc là một dòng lịch
 * sử riêng (backend không ghi đè, chỉ thêm dòng mới) — dữ liệu nhạy cảm
 * (SALARY/COST), mọi thao tác khai báo/xem đều được backend tự ghi nhật ký.
 */
export interface EmployeeHourlyRateRes {
  id: number;
  employeeId: number;
  hourlyRate: number;
  /** `yyyy-MM-dd` */
  effectiveFrom: string;
}

export interface EmployeeHourlyRateCreatePayload {
  hourlyRate: number;
  /** `yyyy-MM-dd` */
  effectiveFrom: string;
}

/**
 * Kết quả tra cứu `GET /employees/{employeeId}/rates/resolve` — chi phí giờ
 * công áp dụng tại một ngày phát sinh. `missingCostData` = true khi ngày đó
 * sớm hơn mọi mốc hiệu lực đã khai báo (TC-03) — không phải lỗi hệ thống,
 * `hourlyRate`/`effectiveFrom` sẽ là `null`.
 */
export interface ResolvedEmployeeHourlyRateRes {
  employeeId: number;
  hourlyRate: number | null;
  effectiveFrom: string | null;
  missingCostData: boolean;
}
