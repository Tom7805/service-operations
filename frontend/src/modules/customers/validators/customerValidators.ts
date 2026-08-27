import type { CustomerCreatePayload, CustomerFormErrors } from '../types/customerTypes';

export const CUSTOMER_VALIDATION_LIMITS = {
  NAME_MAX_LENGTH: 255,
  TAX_CODE_MAX_LENGTH: 50,
  PHONE_MAX_LENGTH: 30,
  INDUSTRY_MAX_LENGTH: 255,
  ADDRESS_MAX_LENGTH: 500,
  OVERRIDE_REASON_MAX_LENGTH: 1000,
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

