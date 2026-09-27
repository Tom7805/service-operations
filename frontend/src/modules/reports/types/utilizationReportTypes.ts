/** NCL-11-CN-002 — Báo cáo tỷ lệ giờ tính phí. */
export interface UtilizationDepartmentRes {
  departmentId: number | null;
  departmentName: string;
  employeeCount: number;
  billableHours: number;
  standardHours: number;
  /** Phân số, không phải %; `null` khi `standardHours = 0` mà vẫn có giờ tính phí (thường do nhập sai ngày vào/nghỉ việc). */
  ratio: number | null;
}

export interface UtilizationEmployeeRes {
  employeeId: number;
  userId: number;
  fullName: string;
  professionalRole: string | null;
  departmentId: number | null;
  departmentName: string | null;
  billableHours: number;
  standardHours: number;
  ratio: number | null;
}

export interface UtilizationReportRes {
  from: string; // ISO date (YYYY-MM-DD)
  to: string; // ISO date (YYYY-MM-DD)
  totalBillableHours: number;
  totalStandardHours: number;
  totalRatio: number | null;
  /** Giờ tính phí đã duyệt của tài khoản không xuất hiện trong báo cáo (chưa có hồ sơ nhân sự hoặc không làm việc ngày nào trong kỳ). */
  unlistedBillableHours: number;
  departments: UtilizationDepartmentRes[];
  employees: UtilizationEmployeeRes[];
}
