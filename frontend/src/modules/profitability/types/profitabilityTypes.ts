/**
 * Một dòng biên lợi nhuận của một khách hàng trong kỳ báo cáo (NCL-09-CN-005, TC-01).
 * Khớp `CustomerMarginLineRes` phía backend.
 */
export interface CustomerMarginLineRes {
  customerId: number;
  customerCode: string;
  customerName: string;
  approvedHours: number; // BigDecimal
  revenue: number; // BigDecimal
  cost: number; // BigDecimal — @MaskSensitive COST (VT-01 luôn xem được giá trị thật)
  margin: number; // BigDecimal — @MaskSensitive COST
  marginPercent: number | null; // BigDecimal (đã nhân 100, ví dụ 60.00 = 60%), null khi revenue = 0
}

/**
 * Báo cáo biên lợi nhuận theo khách hàng trong một kỳ (NCL-09-CN-005, TC-01).
 * Khớp `MarginByCustomerRes` phía backend.
 */
export interface MarginByCustomerRes {
  periodFrom: string; // YYYY-MM-DD
  periodTo: string; // YYYY-MM-DD
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  totalMarginPercent: number | null;
  lines: CustomerMarginLineRes[];
  missingCostEntryCount: number;
  missingRevenueEntryCount: number;
}

/**
 * Một dòng biên lợi nhuận của một nhân sự trong kỳ báo cáo (NCL-09-CN-005, TC-02).
 * Khớp `EmployeeMarginLineRes` phía backend.
 */
export interface EmployeeMarginLineRes {
  employeeId: number;
  employeeName: string;
  professionalRole: string | null;
  approvedHours: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number | null;
}

/**
 * Báo cáo biên lợi nhuận theo nhân sự trong một kỳ (NCL-09-CN-005, TC-02).
 * Khớp `MarginByEmployeeRes` phía backend.
 */
export interface MarginByEmployeeRes {
  periodFrom: string;
  periodTo: string;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  totalMarginPercent: number | null;
  lines: EmployeeMarginLineRes[];
  missingCostEntryCount: number;
  missingRevenueEntryCount: number;
}
