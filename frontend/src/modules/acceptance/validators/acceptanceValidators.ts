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

/* ===== NCL-12-CN-004 — Sản phẩm bàn giao và phiên bản ===== */

export const DELIVERABLE_NAME_MAX_LENGTH = 255;
export const DELIVERABLE_DESCRIPTION_MAX_LENGTH = 1000;
export const VERSION_NO_MAX_LENGTH = 50;
export const RECEIVER_MAX_LENGTH = 255;
export const FILE_URL_MAX_LENGTH = 500;

export interface DeliverableFormInput {
  workPackageId: number | null;
  name: string;
  deliverableType: string;
  description: string;
}

export type DeliverableFormErrors = Partial<Record<keyof DeliverableFormInput, string>>;

/** Khớp DeliverableCreateReq; tên trùng trong cùng hạng mục (không phân biệt hoa thường) chặn trước khi gửi. */
export function validateDeliverableForm(
  input: DeliverableFormInput,
  existingNamesInWorkPackage: string[] = []
): { isValid: boolean; errors: DeliverableFormErrors } {
  const errors: DeliverableFormErrors = {};
  if (input.workPackageId == null) errors.workPackageId = 'Chọn hạng mục của sản phẩm bàn giao';
  const name = input.name.trim();
  if (!name) errors.name = 'Nhập tên sản phẩm bàn giao';
  else if (name.length > DELIVERABLE_NAME_MAX_LENGTH) errors.name = `Tên sản phẩm tối đa ${DELIVERABLE_NAME_MAX_LENGTH} ký tự`;
  else if (existingNamesInWorkPackage.some((n) => n.trim().toLowerCase() === name.toLowerCase())) {
    errors.name = `Hạng mục đã có sản phẩm "${name}" — đặt tên khác`;
  }
  if (!input.deliverableType) errors.deliverableType = 'Chọn loại sản phẩm';
  if (input.description.trim().length > DELIVERABLE_DESCRIPTION_MAX_LENGTH) {
    errors.description = `Mô tả tối đa ${DELIVERABLE_DESCRIPTION_MAX_LENGTH} ký tự`;
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

export interface VersionFormInput {
  versionNo: string;
  deliveredDate: string;
  receiverName: string;
  fileUrl: string;
  note: string;
}

export type VersionFormErrors = Partial<Record<keyof VersionFormInput, string>>;

/** So khớp số phiên bản như backend: bỏ khoảng trắng đầu/cuối, không phân biệt hoa thường. */
export function normalizeVersionNo(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * NCL-12-CN-004 — khớp DeliverableVersionReq: số phiên bản bắt buộc, duy nhất trong sản phẩm (TC-02); ngày bàn
 * giao không ở tương lai; người nhận bắt buộc.
 */
export function validateVersionForm(
  input: VersionFormInput,
  existingVersionNos: string[],
  today: string = todayLocalIso()
): { isValid: boolean; errors: VersionFormErrors } {
  const errors: VersionFormErrors = {};
  const versionNo = input.versionNo.trim();
  if (!versionNo) errors.versionNo = 'Nhập số phiên bản';
  else if (versionNo.length > VERSION_NO_MAX_LENGTH) errors.versionNo = `Số phiên bản tối đa ${VERSION_NO_MAX_LENGTH} ký tự`;
  else if (existingVersionNos.some((v) => normalizeVersionNo(v) === normalizeVersionNo(versionNo))) {
    errors.versionNo = `Phiên bản "${versionNo}" đã tồn tại — vui lòng đặt số phiên bản khác`;
  }
  if (!input.deliveredDate) errors.deliveredDate = 'Chọn ngày bàn giao';
  else if (input.deliveredDate > today) errors.deliveredDate = 'Ngày bàn giao không được ở tương lai';
  const receiver = input.receiverName.trim();
  if (!receiver) errors.receiverName = 'Nhập người nhận phía khách hàng';
  else if (receiver.length > RECEIVER_MAX_LENGTH) errors.receiverName = `Tên người nhận tối đa ${RECEIVER_MAX_LENGTH} ký tự`;
  if (input.fileUrl.trim().length > FILE_URL_MAX_LENGTH) errors.fileUrl = `Đường dẫn tệp tối đa ${FILE_URL_MAX_LENGTH} ký tự`;
  if (input.note.trim().length > NOTE_MAX_LENGTH) errors.note = `Ghi chú tối đa ${NOTE_MAX_LENGTH} ký tự`;
  return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * Gợi ý số phiên bản kế tiếp từ phiên bản mới nhất: tăng số cuối cùng ("1.1" → "1.2", "v2" → "v3"); không có
 * số nào hoặc chưa có phiên bản thì gợi ý "1.0". Người dùng vẫn sửa được.
 */
export function suggestNextVersionNo(latestVersionNo: string | null | undefined, existing: string[] = []): string {
  if (!latestVersionNo) return existing.length === 0 ? '1.0' : '';
  const match = latestVersionNo.trim().match(/^(.*?)(\d+)(\D*)$/);
  if (!match) return '';
  const [, prefix, num, suffix] = match;
  let n = Number(num) + 1;
  let candidate = `${prefix}${n}${suffix}`;
  const taken = new Set(existing.map(normalizeVersionNo));
  while (taken.has(normalizeVersionNo(candidate))) {
    n += 1;
    candidate = `${prefix}${n}${suffix}`;
  }
  return candidate;
}

/** Đường dẫn mô phỏng cho tệp bàn giao người dùng chọn (backend chỉ lưu chuỗi). */
export function simulatedDeliverablePath(deliverableId: number, versionNo: string, fileName: string): string {
  const safeVersion = versionNo.trim().replace(/\s+/g, '-') || 'ban-giao';
  return `/files/ban-giao/${deliverableId}/${safeVersion}/${fileName.trim().replace(/\s+/g, '-')}`;
}
