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
