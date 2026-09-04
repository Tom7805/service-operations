import type { OpportunityCreatePayload, OpportunityFormErrors } from '../types/opportunityTypes';

export const OPPORTUNITY_LIMITS = {
  NAME_MAX_LENGTH: 255,
  MAX_EXPECTED_VALUE: 1_000_000_000_000_000, // 1 triệu tỷ VNĐ trần kỹ thuật
};

/**
 * Kiểm tra tính hợp lệ của dữ liệu tạo cơ hội bán hàng (NCL-03-CN-001)
 * Tuân thủ TC-01 (khách hàng có hồ sơ), TC-02 (giá trị dự kiến phải là số dương)
 */
export function validateOpportunityCreate(payload: OpportunityCreatePayload): OpportunityFormErrors {
  const errors: OpportunityFormErrors = {};

  // 1. Kiểm tra Tên cơ hội
  if (!payload.name || payload.name.trim().length === 0) {
    errors.name = 'Tên cơ hội không được để trống';
  } else if (payload.name.trim().length > OPPORTUNITY_LIMITS.NAME_MAX_LENGTH) {
    errors.name = `Tên cơ hội không được vượt quá ${OPPORTUNITY_LIMITS.NAME_MAX_LENGTH} ký tự (hiện có ${payload.name.trim().length} ký tự)`;
  }

  // 2. Kiểm tra Khách hàng (TC-01)
  if (!payload.customerId || isNaN(payload.customerId) || payload.customerId <= 0) {
    errors.customerId = 'Vui lòng chọn khách hàng cho cơ hội bán hàng';
  }

  // 3. Kiểm tra Giá trị dự kiến (TC-02)
  if (payload.expectedValue === undefined || payload.expectedValue === null || isNaN(payload.expectedValue)) {
    errors.expectedValue = 'Giá trị dự kiến không được để trống';
  } else if (payload.expectedValue <= 0) {
    errors.expectedValue = 'Giá trị dự kiến phải là số dương lớn hơn 0';
  } else if (payload.expectedValue > OPPORTUNITY_LIMITS.MAX_EXPECTED_VALUE) {
    errors.expectedValue = 'Giá trị dự kiến vượt quá hạn mức cho phép của hệ thống';
  }

  // 4. Kiểm tra Ngày dự kiến chốt (nếu có nhập)
  if (payload.expectedCloseDate && payload.expectedCloseDate.trim().length > 0) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(payload.expectedCloseDate.trim())) {
      errors.expectedCloseDate = 'Ngày dự kiến chốt không đúng định dạng YYYY-MM-DD';
    } else {
      const parsedDate = new Date(payload.expectedCloseDate.trim());
      if (isNaN(parsedDate.getTime())) {
        errors.expectedCloseDate = 'Ngày dự kiến chốt không hợp lệ';
      }
    }
  }

  return errors;
}

/**
 * Định dạng số tiền VNĐ hiển thị có phân cách hàng nghìn (ví dụ: 500000000 -> "500.000.000")
 */
export function formatVNDInput(value: number | string): string {
  if (value === '' || value === undefined || value === null) return '';
  const numStr = typeof value === 'number' ? value.toString() : value.replace(/\D/g, '');
  if (!numStr) return '';
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Chuyển chuỗi số định dạng ("500.000.000") thành số nguyên
 */
export function parseVNDInput(formatted: string): number {
  const clean = formatted.replace(/\./g, '').replace(/,/g, '').trim();
  const parsed = Number(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Chuyển số tiền VNĐ thành chữ tiếng Việt (hỗ trợ nhập liệu CRM B2B chính xác, tránh nhầm số 0)
 */
export function convertVNDToWords(amount: number): string {
  if (!amount || amount <= 0 || isNaN(amount)) return '';

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThreeDigits(n: number, isLastGroup: boolean): string {
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    let res = '';

    if (h > 0 || !isLastGroup) {
      res += digits[h] + ' trăm ';
    }
    if (t === 0 && o !== 0 && (h > 0 || !isLastGroup)) {
      res += 'lẻ ';
    }
    if (t === 1) {
      res += 'mười ';
    } else if (t > 1) {
      res += digits[t] + ' mươi ';
    }

    if (t > 1 && o === 1) {
      res += 'mốt';
    } else if (t > 0 && o === 5) {
      res += 'lăm';
    } else if (o > 0) {
      res += digits[o];
    }

    return res.trim();
  }

  let num = Math.floor(amount);
  if (num === 0) return 'Không đồng';

  const groups: number[] = [];
  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const grp = groups[i];
    if (grp > 0) {
      const isHighest = i === groups.length - 1;
      const grpText = readThreeDigits(grp, isHighest);
      words += grpText + ' ' + units[i] + ' ';
    }
  }

  words = words.trim() + ' đồng';
  return words.charAt(0).toUpperCase() + words.slice(1);
}
