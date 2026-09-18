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
