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