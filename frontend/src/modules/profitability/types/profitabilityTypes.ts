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

/** Khớp enum ContractType phía backend (Contract.contractType). */
export type ContractType = 'TIME_AND_MATERIAL' | 'FIXED_PRICE' | 'MAINTENANCE' | 'MILESTONE';

/** Khớp enum RecognitionMethod phía backend — suy ra từ ContractType (NCL-09-CN-002). */
export type RecognitionMethod = 'HOURLY' | 'PERCENTAGE_OF_COMPLETION';

/**
 * Một dòng giá vốn giờ công của một nhân sự trong dự án (NCL-09-CN-001).
 * Khớp `LaborCostLineRes` phía backend — `hourlyRate` và `laborCost` được đánh dấu
 * `@MaskSensitive(MaskingLevel.COST)` nên backend tự masking khi người gọi không có
 * quyền xem dữ liệu lương/giá vốn. Frontend dùng `canViewSensitiveData` để quyết định
 * hiển thị giá trị thực hay ẩn bằng MaskedCell.
 */
export interface LaborCostLineRes {
  timeEntryId: number;
  employeeId: number;
  workDate: string; // YYYY-MM-DD (LocalDate)
  hours: number; // BigDecimal → number
  hourlyRate: number; // @MaskSensitive COST
  laborCost: number; // @MaskSensitive COST
  missingCostData: boolean;
}

/**
 * Tổng hợp giá vốn giờ công của một dự án (NCL-09-CN-001).
 * Khớp `ProjectLaborCostRes` phía backend.
 */
export interface ProjectLaborCostRes {
  projectId: number;
  totalApprovedHours: number; // BigDecimal
  totalLaborCost: number; // BigDecimal
  missingCostEntryCount: number;
  lines: LaborCostLineRes[];
}

/**
 * So sánh biên lợi nhuận dự kiến (từ báo giá mới nhất gắn với hợp đồng của dự án —
 * NCL-04-CN-001) với biên lợi nhuận thực tế (từ mọi dòng giờ công ĐÃ DUYỆT của dự án
 * tính đến hiện tại — NCL-09-CN-006).
 *
 * Khớp `PlannedVsActualMarginRes` phía backend. Khác với `LaborCostLineRes`, response này
 * chỉ trả số liệu TỔNG HỢP cấp dự án (không định danh lương bất kỳ nhân sự nào) nên
 * **không** áp dụng che dữ liệu QTN-02 — frontend hiển thị trực tiếp mọi giá trị.
 *
 * `plannedMarginPercent` / `actualMarginPercent` / `marginGapPercentPoints` có thể `null`
 * khi doanh thu bằng 0 (không thể tính %) hoặc thiếu một trong hai vế để so sánh.
 */
export interface PlannedVsActualMarginRes {
  projectId: number;
  quoteId: number;
  quoteVersion: number;

  plannedWorkDays: number; // BigDecimal → số ngày công dự kiến
  plannedRevenue: number; // BigDecimal
  plannedCost: number; // BigDecimal
  plannedMargin: number; // BigDecimal
  plannedMarginPercent: number | null; // BigDecimal, null khi doanh thu dự kiến = 0

  actualHours: number; // BigDecimal → tổng giờ đã duyệt
  actualRevenue: number; // BigDecimal
  actualCost: number; // BigDecimal
  actualMargin: number; // BigDecimal
  actualMarginPercent: number | null; // BigDecimal, null khi doanh thu thực tế = 0

  /** actualMarginPercent - plannedMarginPercent (điểm phần trăm); null nếu thiếu 1 trong 2 vế. */
  marginGapPercentPoints: number | null;
  /** Giờ thực tế trừ giờ dự kiến (plannedWorkDays × 8). */
  hoursVarianceVsPlanned: number;
  /** Danh sách diễn giải ngắn nguyên nhân chênh lệch. */
  gapReasons: string[];

  /** Số dòng báo giá không ước tính được chi phí dự kiến (chưa có nhân sự giữ vai trò đó). */
  missingPlannedCostItemCount: number;
  /** Số dòng giờ công đã duyệt chưa có chi phí giờ công nội bộ. */
  missingActualCostEntryCount: number;
  /** Số dòng giờ công đã duyệt chưa tra được đơn giá doanh thu. */
  missingActualRevenueEntryCount: number;
}

/**
 * Một dòng doanh thu ghi nhận từ dòng giờ công đã duyệt của hợp đồng theo giờ
 * (NCL-09-CN-002, phương thức `HOURLY`). Khớp `RevenueLineRes` phía backend.
 */
export interface RevenueLineRes {
  timeEntryId: number;
  employeeId: number;
  workDate: string; // YYYY-MM-DD (LocalDate)
  hours: number; // BigDecimal → number
  appliedRate: number; // BigDecimal — đơn giá/giờ áp dụng tại workDate
  lineRevenue: number; // BigDecimal — hours × appliedRate
  billable: boolean; // false → bị loại khỏi doanh thu (vẫn hiển thị để đối soát)
  missingRateData: boolean; // true → chưa tra được đơn giá, không cộng vào tổng
}

/**
 * Doanh thu ghi nhận của một dự án (NCL-09-CN-002), tính động theo đúng loại hợp đồng.
 * Khớp `RecognizedRevenueRes` phía backend.
 *
 * Với `recognitionMethod = 'HOURLY'`: `totalBillableHours`, `missingRateEntryCount` và
 * `lines` có giá trị; `completionRate`/`totalTaskCount`/`doneTaskCount` là `null`.
 * Với `'PERCENTAGE_OF_COMPLETION'` thì ngược lại.
 */
export interface RecognizedRevenueRes {
  projectId: number;
  contractId: number;
  contractType: ContractType;
  recognitionMethod: RecognitionMethod;
  totalRecognizedRevenue: number; // BigDecimal
  totalBillableHours: number | null; // BigDecimal
  excludedLineCount: number;
  missingRateEntryCount: number;
  completionRate: number | null; // BigDecimal, 0..1 (4 chữ số thập phân)
  totalTaskCount: number | null;
  doneTaskCount: number | null;
  lines: RevenueLineRes[];
}

/**
 * Biên lợi nhuận gộp của dự án (NCL-09-CN-003), tính động từ doanh thu ghi nhận và
 * toàn bộ chi phí đã duyệt tại thời điểm đọc. Khớp `ProjectMarginRes` phía backend.
 *
 * `totalCost = laborCost + projectExpenseCost + subcontractorCost`,
 * `grossProfit = recognizedRevenue - totalCost`,
 * `marginRate = grossProfit / recognizedRevenue` (`null` khi `recognizedRevenue = 0`).
 *
 * Không trường tổng hợp nào ở đây bị `@MaskSensitive` — chỉ `hourlyRate`/`laborCost`
 * bên trong từng dòng của `laborCostLines` mới bị che (QTN-02), để Quản lý dự án
 * (VT-02) vẫn xem được bức tranh doanh thu/chi phí/lợi nhuận tổng quát của dự án.
 */
export interface ProjectMarginRes {
  projectId: number;
  recognizedRevenue: number; // BigDecimal
  laborCost: number; // BigDecimal
  projectExpenseCost: number; // BigDecimal
  subcontractorCost: number; // BigDecimal
  totalCost: number; // BigDecimal
  grossProfit: number; // BigDecimal
  marginRate: number | null; // BigDecimal, null khi recognizedRevenue = 0
  missingCostEntryCount: number;
  missingRateEntryCount: number;
  laborCostLines: LaborCostLineRes[];
  revenueLines: RevenueLineRes[];
}

/**
 * Ngưỡng cảnh báo biên lợi nhuận tối thiểu toàn công ty (NCL-09-CN-004).
 * Khớp `MarginAlertRes` phía backend. Các trường đều `null` nếu Ban giám đốc (VT-01)
 * chưa từng đặt ngưỡng — khi đó hệ thống không cảnh báo dự án nào.
 */
export interface MarginAlertThresholdRes {
  minMarginRate: number | null; // BigDecimal, dạng phân số (0.15 = 15%)
  updatedBy: string | null;
  updatedAt: string | null; // LocalDateTime ISO
}

/**
 * Payload đặt/đổi ngưỡng cảnh báo âm biên. Khớp `MarginThresholdReq` phía backend.
 */
export interface MarginThresholdReq {
  minMarginRate: number; // dạng phân số (0.15 = 15%), trong khoảng [-1.0, 1.0]
}
