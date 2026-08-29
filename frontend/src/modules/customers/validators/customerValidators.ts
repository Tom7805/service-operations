import type {
  CustomerCreatePayload,
  CustomerFormErrors,
  CustomerContactPayload,
  CustomerContactFormErrors,
  CustomerSegmentPayload,
  CustomerSegmentFormErrors,
  CustomerMergeFormErrors,
} from '../types/customerTypes';

export const CUSTOMER_VALIDATION_LIMITS = {
  NAME_MAX_LENGTH: 255,
  TAX_CODE_MAX_LENGTH: 50,
  PHONE_MAX_LENGTH: 30,
  INDUSTRY_MAX_LENGTH: 255,
  ADDRESS_MAX_LENGTH: 500,
  OVERRIDE_REASON_MAX_LENGTH: 1000,
  CONTACT_NAME_MAX_LENGTH: 255,
  CONTACT_TITLE_MAX_LENGTH: 255,
  CONTACT_EMAIL_MAX_LENGTH: 255,
  CONTACT_PHONE_MAX_LENGTH: 30,
  SEGMENT_COMPANY_SIZE_MAX_LENGTH: 50,
  SEGMENT_PRIORITY_MAX_LENGTH: 50,
} as const;

/**
 * Kiểm tra hợp lệ dữ liệu tạo mới hồ sơ khách hàng (NCL-02-CN-001 & NCL-02-CN-002)
 * @param payload Dữ liệu tạo khách hàng
 * @returns Object chứa danh sách lỗi (nếu có)
 */
export function validateCustomerCreate(payload: Partial<CustomerCreatePayload>): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

  // 1. Tên khách hàng (bắt buộc, max 255 ký tự, không được chỉ chứa khoảng trắng)
  const trimmedName = payload.name?.trim();
  if (!payload.name || trimmedName === '') {
    errors.name = 'Tên khách hàng không được để trống';
  } else if (payload.name.length > CUSTOMER_VALIDATION_LIMITS.NAME_MAX_LENGTH) {
    errors.name = `Tên khách hàng không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.NAME_MAX_LENGTH} ký tự (hiện có: ${payload.name.length})`;
  }

  // 2. Mã số thuế (tùy chọn, max 50 ký tự)
  if (payload.taxCode && payload.taxCode.length > CUSTOMER_VALIDATION_LIMITS.TAX_CODE_MAX_LENGTH) {
    errors.taxCode = `Mã số thuế không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.TAX_CODE_MAX_LENGTH} ký tự (hiện có: ${payload.taxCode.length})`;
  }

  // 3. Số điện thoại (tùy chọn, max 30 ký tự - NCL-02-CN-002)
  if (payload.phone && payload.phone.length > CUSTOMER_VALIDATION_LIMITS.PHONE_MAX_LENGTH) {
    errors.phone = `Số điện thoại không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.PHONE_MAX_LENGTH} ký tự (hiện có: ${payload.phone.length})`;
  }

  // 4. Ngành nghề / Lĩnh vực (tùy chọn, max 255 ký tự)
  if (payload.industry && payload.industry.length > CUSTOMER_VALIDATION_LIMITS.INDUSTRY_MAX_LENGTH) {
    errors.industry = `Lĩnh vực/ngành nghề không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.INDUSTRY_MAX_LENGTH} ký tự (hiện có: ${payload.industry.length})`;
  }

  // 5. Địa chỉ (tùy chọn, max 500 ký tự)
  if (payload.address && payload.address.length > CUSTOMER_VALIDATION_LIMITS.ADDRESS_MAX_LENGTH) {
    errors.address = `Địa chỉ không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.ADDRESS_MAX_LENGTH} ký tự (hiện có: ${payload.address.length})`;
  }

  return errors;
}

/**
 * Kiểm tra hợp lệ lý do xác nhận tạo mới bỏ qua cảnh báo trùng hồ sơ (NCL-02-CN-002, TC-02)
 * @param reason Lý do người dùng nhập
 * @returns Thông báo lỗi nếu không hợp lệ, hoặc null nếu hợp lệ
 */
export function validateDuplicateOverrideReason(reason: string): string | null {
  const trimmed = reason ? reason.trim() : '';
  if (!trimmed) {
    return 'Phải ghi lý do khi bỏ qua cảnh báo trùng hồ sơ';
  }
  if (reason.length > CUSTOMER_VALIDATION_LIMITS.OVERRIDE_REASON_MAX_LENGTH) {
    return `Lý do không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.OVERRIDE_REASON_MAX_LENGTH} ký tự (hiện có: ${reason.length})`;
  }
  return null;
}

/**
 * Kiểm tra hợp lệ dữ liệu người liên hệ khách hàng (NCL-02-CN-003, TC-01)
 * @param payload Dữ liệu người liên hệ
 * @returns Object chứa danh sách lỗi (nếu có)
 */
export function validateCustomerContact(
  payload: Partial<CustomerContactPayload>
): CustomerContactFormErrors {
  const errors: CustomerContactFormErrors = {};

  // 1. Họ tên (bắt buộc, max 255 ký tự)
  const trimmedName = payload.fullName?.trim();
  if (!payload.fullName || trimmedName === '') {
    errors.fullName = 'Họ tên người liên hệ không được để trống';
  } else if (payload.fullName.length > CUSTOMER_VALIDATION_LIMITS.CONTACT_NAME_MAX_LENGTH) {
    errors.fullName = `Họ tên không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.CONTACT_NAME_MAX_LENGTH} ký tự`;
  }

  // 2. Chức danh (tùy chọn, max 255 ký tự)
  if (
    payload.title &&
    payload.title.length > CUSTOMER_VALIDATION_LIMITS.CONTACT_TITLE_MAX_LENGTH
  ) {
    errors.title = `Chức danh không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.CONTACT_TITLE_MAX_LENGTH} ký tự`;
  }

  // 3. Email (tùy chọn, đúng định dạng, max 255 ký tự)
  if (payload.email && payload.email.trim() !== '') {
    const trimmedEmail = payload.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Thư điện tử không hợp lệ';
    } else if (trimmedEmail.length > CUSTOMER_VALIDATION_LIMITS.CONTACT_EMAIL_MAX_LENGTH) {
      errors.email = `Thư điện tử không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.CONTACT_EMAIL_MAX_LENGTH} ký tự`;
    }
  }

  // 4. Số điện thoại (tùy chọn, max 30 ký tự)
  if (
    payload.phone &&
    payload.phone.length > CUSTOMER_VALIDATION_LIMITS.CONTACT_PHONE_MAX_LENGTH
  ) {
    errors.phone = `Số điện thoại không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.CONTACT_PHONE_MAX_LENGTH} ký tự`;
  }

  return errors;
}

/**
 * Kiểm tra hợp lệ dữ liệu phân nhóm khách hàng (NCL-02-CN-005, TC-01)
 * Cả ba nhãn — ngành nghề, quy mô, mức độ ưu tiên — đều bắt buộc để lọc và phân tích nhất quán.
 * @param payload Dữ liệu phân nhóm
 * @returns Object chứa danh sách lỗi (nếu có)
 */
export function validateCustomerSegment(
  payload: Partial<CustomerSegmentPayload>
): CustomerSegmentFormErrors {
  const errors: CustomerSegmentFormErrors = {};

  // 1. Ngành nghề (bắt buộc, max 255 ký tự)
  const trimmedIndustry = payload.industry?.trim();
  if (!payload.industry || trimmedIndustry === '') {
    errors.industry = 'Ngành nghề không được để trống';
  } else if (payload.industry.length > CUSTOMER_VALIDATION_LIMITS.INDUSTRY_MAX_LENGTH) {
    errors.industry = `Ngành nghề không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.INDUSTRY_MAX_LENGTH} ký tự`;
  }

  // 2. Quy mô công ty (bắt buộc, max 50 ký tự)
  const trimmedSize = payload.companySize?.trim();
  if (!payload.companySize || trimmedSize === '') {
    errors.companySize = 'Quy mô công ty không được để trống';
  } else if (payload.companySize.length > CUSTOMER_VALIDATION_LIMITS.SEGMENT_COMPANY_SIZE_MAX_LENGTH) {
    errors.companySize = `Quy mô công ty không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.SEGMENT_COMPANY_SIZE_MAX_LENGTH} ký tự`;
  }

  // 3. Mức độ ưu tiên (bắt buộc, max 50 ký tự)
  const trimmedPriority = payload.priority?.trim();
  if (!payload.priority || trimmedPriority === '') {
    errors.priority = 'Mức độ ưu tiên không được để trống';
  } else if (payload.priority.length > CUSTOMER_VALIDATION_LIMITS.SEGMENT_PRIORITY_MAX_LENGTH) {
    errors.priority = `Mức độ ưu tiên không được vượt quá ${CUSTOMER_VALIDATION_LIMITS.SEGMENT_PRIORITY_MAX_LENGTH} ký tự`;
  }

  return errors;
}

/**
 * Kiểm tra hợp lệ lựa chọn gộp hai hồ sơ khách hàng trùng (NCL-02-CN-006).
 * Cả hai ID đều bắt buộc, phải là số nguyên dương và không được trùng nhau.
 * @returns Object chứa danh sách lỗi (nếu có)
 */
export function validateCustomerMergeSelection(
  targetCustomerId: number | null,
  sourceCustomerId: number | null
): CustomerMergeFormErrors {
  const errors: CustomerMergeFormErrors = {};

  if (!targetCustomerId || targetCustomerId <= 0) {
    errors.targetCustomerId = 'Phải chọn ID hồ sơ giữ lại (số nguyên dương)';
  }

  if (!sourceCustomerId || sourceCustomerId <= 0) {
    errors.sourceCustomerId = 'Phải chọn ID hồ sơ bị gộp (số nguyên dương)';
  }

  if (
    !errors.targetCustomerId &&
    !errors.sourceCustomerId &&
    targetCustomerId === sourceCustomerId
  ) {
    errors.general = 'Hồ sơ giữ lại và hồ sơ bị gộp không được trùng nhau';
  }

  return errors;
}

