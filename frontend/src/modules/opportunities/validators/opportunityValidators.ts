import type { OpportunityClosePayload } from "../types/opportunityTypes";

export interface OpportunityCloseValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Kiểm tra tính hợp lệ dữ liệu đóng cơ hội với kết quả thắng/thua (NCL-03-CN-005, TC-01, TC-02).
 */
export function validateOpportunityClose(
  payload: Partial<OpportunityClosePayload>,
): OpportunityCloseValidationResult {
  const errors: Record<string, string> = {};

  if (
    !payload.result ||
    (payload.result !== "WON" && payload.result !== "LOST")
  ) {
    errors.result = "Phải chọn kết quả đóng cơ hội (Thắng hoặc Thua).";
  }

  // TC-02: Bắt buộc chọn lý do khi ghi nhận kết quả thua (LOST)
  if (payload.result === "LOST" && !payload.lossReason) {
    errors.lossReason =
      "Vui lòng chọn lý do khi ghi nhận cơ hội thất bại (TC-02).";
  }

  if (payload.reasonDetail && payload.reasonDetail.trim().length > 500) {
    errors.reasonDetail =
      "Ghi chú lý do chi tiết không được vượt quá 500 ký tự.";
  }

  if (payload.competitorName && payload.competitorName.trim().length > 255) {
    errors.competitorName =
      "Tên đối thủ cạnh tranh không được vượt quá 255 ký tự.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
