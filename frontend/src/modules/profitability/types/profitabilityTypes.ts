/** Khớp enum ContractType phía backend (Contract.contractType). */
export type ContractType = 'TIME_AND_MATERIAL' | 'FIXED_PRICE' | 'MAINTENANCE' | 'MILESTONE';

/** Khớp enum RecognitionMethod phía backend — suy ra từ ContractType (NCL-09-CN-002). */
export type RecognitionMethod = 'HOURLY' | 'PERCENTAGE_OF_COMPLETION';

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
