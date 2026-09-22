/**
 * Bộ kiểm tra hợp lệ phía client cho các biểu mẫu hóa đơn (Epic NCL-10).
 */

export interface MilestoneInvoiceFormInput {
  invoiceDate?: string;
  note?: string;
}

export interface MilestoneInvoiceValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Kiểm tra hợp lệ biểu mẫu lập hóa đơn theo mốc hợp đồng (NCL-10-CN-002).
 * Cả hai trường đều tùy chọn ở backend — chỉ chặn phía client khi đã nhập
 * nhưng sai định dạng/quá dài, để phản hồi lỗi ngay thay vì chờ round-trip API.
 */
export function validateMilestoneInvoiceForm(input: MilestoneInvoiceFormInput): MilestoneInvoiceValidationResult {
  const errors: Record<string, string> = {};

  if (input.invoiceDate && Number.isNaN(new Date(input.invoiceDate).getTime())) {
    errors.invoiceDate = 'Ngày hóa đơn không hợp lệ';
  }

  if (input.note && input.note.length > 1000) {
    errors.note = 'Ghi chú không được quá 1000 ký tự';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
