/**
 * Một dòng giá vốn giờ công của một nhân sự trong dự án (NCL-09-CN-001).
 * Khớp `LaborCostLineRes` phía backend — `hourlyRate` và `laborCost` được đánh dấu
 * `@MaskSensitive(MaskingLevel.COST)` nên backend tự masquing khi người gọi không có
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