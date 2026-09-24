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

export const SIGNER_MAX_LENGTH = 255;
export const MINUTES_URL_MAX_LENGTH = 500;
export const REASON_MAX_LENGTH = 1000;

/** Ngày hôm nay theo giờ máy người dùng, dạng YYYY-MM-DD (không dùng toISOString — lệch múi giờ UTC). */
export function todayLocalIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export interface ConfirmFormInput {
  signerName: string;
  signedDate: string;
  minutesUrl: string;
}

export type ConfirmFormErrors = Partial<Record<keyof ConfirmFormInput, string>>;

/**
 * NCL-12-CN-002 TC-01 — khớp AcceptanceConfirmReq và kiểm tra ngày ký của backend: bắt buộc người ký,
 * ngày ký, biên bản; ngày ký không ở tương lai và không trước ngày lập phiếu.
 */
export function validateConfirmForm(
  input: ConfirmFormInput,
  certificateCreatedAt: string,
  today: string = todayLocalIso()
): { isValid: boolean; errors: ConfirmFormErrors } {
  const errors: ConfirmFormErrors = {};
  const signer = input.signerName.trim();
  if (!signer) errors.signerName = 'Nhập tên người đại diện khách hàng ký xác nhận';
  else if (signer.length > SIGNER_MAX_LENGTH) errors.signerName = `Tên người ký tối đa ${SIGNER_MAX_LENGTH} ký tự`;

  const createdDate = (certificateCreatedAt ?? '').slice(0, 10);
  if (!input.signedDate) errors.signedDate = 'Chọn ngày ký biên bản';
  else if (input.signedDate > today) errors.signedDate = 'Ngày ký biên bản không được ở tương lai';
  else if (createdDate && input.signedDate < createdDate) {
    errors.signedDate = `Ngày ký không được trước ngày lập phiếu (${createdDate.split('-').reverse().join('/')})`;
  }

  const url = input.minutesUrl.trim();
  if (!url) errors.minutesUrl = 'Tải lên hoặc nhập đường dẫn biên bản nghiệm thu đã ký';
  else if (url.length > MINUTES_URL_MAX_LENGTH) errors.minutesUrl = `Đường dẫn biên bản tối đa ${MINUTES_URL_MAX_LENGTH} ký tự`;

  return { isValid: Object.keys(errors).length === 0, errors };
}

export interface RejectFormInput {
  reason: string;
  signerName: string;
  minutesUrl: string;
}

export type RejectFormErrors = Partial<Record<keyof RejectFormInput, string>>;

/** NCL-12-CN-002 TC-02 — lý do từ chối bắt buộc; người ký và biên bản tuỳ chọn. */
export function validateRejectForm(input: RejectFormInput): { isValid: boolean; errors: RejectFormErrors } {
  const errors: RejectFormErrors = {};
  const reason = input.reason.trim();
  if (!reason) errors.reason = 'Nhập lý do khách hàng từ chối nghiệm thu';
  else if (reason.length > REASON_MAX_LENGTH) errors.reason = `Lý do từ chối tối đa ${REASON_MAX_LENGTH} ký tự`;
  if (input.signerName.trim().length > SIGNER_MAX_LENGTH) errors.signerName = `Tên người ký tối đa ${SIGNER_MAX_LENGTH} ký tự`;
  if (input.minutesUrl.trim().length > MINUTES_URL_MAX_LENGTH) {
    errors.minutesUrl = `Đường dẫn biên bản tối đa ${MINUTES_URL_MAX_LENGTH} ký tự`;
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

/** Đường dẫn mô phỏng cho tệp biên bản người dùng chọn (backend chỉ lưu chuỗi, không nhận tệp thật). */
export function simulatedMinutesPath(certificateCode: string, fileName: string): string {
  const safe = fileName.trim().replace(/\s+/g, '-');
  return `/files/nghiem-thu/${certificateCode}/${safe}`;
}
