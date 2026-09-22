/**
 * Các lỗi validate form tạo đề nghị xuất hóa đơn từ giờ công đã duyệt (NCL-10-CN-001),
 * khớp ràng buộc backend `InvoiceProposalCreateReq` — kiểm tra trước khi gọi API để tránh
 * round-trip cho lỗi rõ ràng.
 */
export interface InvoiceProposalFormErrors {
  projectId?: string;
  periodFrom?: string;
  periodTo?: string;
  note?: string;
}

export function validateInvoiceProposalForm(input: {
  projectId: string;
  periodFrom: string;
  periodTo: string;
  note: string;
}): InvoiceProposalFormErrors {
  const errors: InvoiceProposalFormErrors = {};

  const projectId = Number(input.projectId);
  if (!input.projectId.trim() || !Number.isInteger(projectId) || projectId <= 0) {
    errors.projectId = 'Mã dự án không được để trống';
  }

  if (!input.periodFrom) {
    errors.periodFrom = 'Ngày bắt đầu kỳ không được để trống';
  } else if (Number.isNaN(new Date(input.periodFrom).getTime())) {
    errors.periodFrom = 'Ngày bắt đầu kỳ không hợp lệ';
  }

  if (!input.periodTo) {
    errors.periodTo = 'Ngày kết thúc kỳ không được để trống';
  } else if (Number.isNaN(new Date(input.periodTo).getTime())) {
    errors.periodTo = 'Ngày kết thúc kỳ không hợp lệ';
  }

  if (!errors.periodFrom && !errors.periodTo && input.periodTo < input.periodFrom) {
    errors.periodTo = 'Ngày kết thúc kỳ không được trước ngày bắt đầu kỳ';
  }

  const note = input.note.trim();
  if (note.length > 1000) errors.note = 'Ghi chú không được vượt 1000 ký tự';

  return errors;
}
