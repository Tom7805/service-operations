/**
 * Kiểm tra hợp lệ phía client cho biểu mẫu lập phiếu nghiệm thu (NCL-12-CN-001) — khớp ràng buộc
 * của AcceptanceCreateReq ở backend để báo lỗi ngay trên ô nhập thay vì chờ 400 VALIDATION_ERROR.
 */

export const TITLE_MAX_LENGTH = 255;
export const NOTE_MAX_LENGTH = 1000;

export interface AcceptanceFormInput {
  workPackageId: number | null;
  title: string;
  acceptedValue: string;
  note: string;
}

export type AcceptanceFormErrors = Partial<Record<keyof AcceptanceFormInput, string>>;

/** Chuyển chuỗi người dùng gõ ("300.000.000", "300000000", "1500000,5") thành số; rỗng/sai → NaN. */
export function parseMoneyInput(raw: string): number {
  const trimmed = raw.trim().replace(/\s/g, '');
  if (!trimmed) return NaN;
  // Dạng vi-VN: dấu chấm ngăn cách hàng nghìn, dấu phẩy thập phân.
  const normalized = /,/.test(trimmed) ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed.replace(/\.(?=\d{3}(\D|$))/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return NaN;
  return Number(normalized);
}

export function validateAcceptanceForm(input: AcceptanceFormInput): {
  isValid: boolean;
  errors: AcceptanceFormErrors;
} {
  const errors: AcceptanceFormErrors = {};

  if (input.workPackageId == null) {
    errors.workPackageId = 'Chọn hạng mục cần nghiệm thu';
  }

  if (input.title.trim().length > TITLE_MAX_LENGTH) {
    errors.title = `Tiêu đề phiếu tối đa ${TITLE_MAX_LENGTH} ký tự`;
  }

  const value = parseMoneyInput(input.acceptedValue);
  if (!input.acceptedValue.trim()) {
    errors.acceptedValue = 'Giá trị nghiệm thu không được để trống';
  } else if (Number.isNaN(value)) {
    errors.acceptedValue = 'Giá trị nghiệm thu phải là số';
  } else if (value < 0) {
    errors.acceptedValue = 'Giá trị nghiệm thu không được âm';
  } else if (value >= 1e16) {
    errors.acceptedValue = 'Giá trị nghiệm thu tối đa 16 chữ số phần nguyên';
  } else if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
    errors.acceptedValue = 'Giá trị nghiệm thu tối đa 2 chữ số thập phân';
  }

  if (input.note.trim().length > NOTE_MAX_LENGTH) {
    errors.note = `Ghi chú tối đa ${NOTE_MAX_LENGTH} ký tự`;
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
