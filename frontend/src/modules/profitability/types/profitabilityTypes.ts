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
