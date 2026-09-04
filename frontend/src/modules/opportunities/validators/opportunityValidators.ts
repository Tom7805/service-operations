import type {
  OpportunityCreatePayload,
  OpportunityFormErrors,
  OpportunityStage,
} from '../types/opportunityTypes';
import { ACTIVE_STAGES_ORDER, STAGE_CONFIGS } from '../types/opportunityTypes';

export const OPPORTUNITY_LIMITS = {
  NAME_MAX_LENGTH: 255,
  MAX_EXPECTED_VALUE: 1_000_000_000_000_000,
};

/**
 * Kiểm tra tính hợp lệ của dữ liệu tạo cơ hội bán hàng (NCL-03-CN-001)
 */
export function validateOpportunityCreate(payload: OpportunityCreatePayload): OpportunityFormErrors {
  const errors: OpportunityFormErrors = {};

  // 1. Tên cơ hội
  if (!payload.name || payload.name.trim().length === 0) {
    errors.name = 'Tên cơ hội không được để trống';
  } else if (payload.name.trim().length > OPPORTUNITY_LIMITS.NAME_MAX_LENGTH) {
    errors.name = `Tên cơ hội không được vượt quá ${OPPORTUNITY_LIMITS.NAME_MAX_LENGTH} ký tự`;
  }

  // 2. Khách hàng
  if (!payload.customerId || isNaN(payload.customerId) || payload.customerId <= 0) {
    errors.customerId = 'Vui lòng chọn khách hàng cho cơ hội bán hàng';
  }

  // 3. Giá trị dự kiến
  if (payload.expectedValue === undefined || payload.expectedValue === null || isNaN(payload.expectedValue)) {
    errors.expectedValue = 'Giá trị dự kiến không được để trống';
  } else if (payload.expectedValue <= 0) {
    errors.expectedValue = 'Giá trị dự kiến phải là số dương lớn hơn 0';
  } else if (payload.expectedValue > OPPORTUNITY_LIMITS.MAX_EXPECTED_VALUE) {
    errors.expectedValue = 'Giá trị dự kiến vượt quá hạn mức cho phép';
  }

  // 4. Ngày dự kiến chốt
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
 * Kiểm tra quy tắc chuyển giai đoạn theo thứ tự nghiêm ngặt (QTN-06 & NCL-03-CN-002, TC-02, TC-03)
 * APPROACH -> PROPOSAL -> NEGOTIATION -> [WON | LOST]
 */
export function canTransitionStage(
  currentStage: OpportunityStage | string,
  targetStage: OpportunityStage | string,
  status?: string
): { allowed: boolean; reason?: string } {
  if (!currentStage || !targetStage) {
    return { allowed: false, reason: 'Giai đoạn không hợp lệ' };
  }

  if (currentStage === targetStage) {
    return { allowed: true };
  }

  // TC-03: Cơ hội đã chốt hoặc đóng (CLOSED, WON, LOST) không thể chuyển tiếp
  if (status === 'CLOSED' || currentStage === 'WON' || currentStage === 'LOST') {
    return {
      allowed: false,
      reason: 'Cơ hội đã hoàn tất và đóng (status = CLOSED). Không thể chuyển giai đoạn tiếp theo.',
    };
  }

  const currentIndex = ACTIVE_STAGES_ORDER.indexOf(currentStage as OpportunityStage);
  if (currentIndex < 0) {
    return { allowed: false, reason: 'Giai đoạn hiện tại không xác định' };
  }

  const isLastActive = currentIndex === ACTIVE_STAGES_ORDER.length - 1; // Đang ở NEGOTIATION

  // Từ NEGOTIATION cho phép chốt sang WON hoặc LOST
  if (isLastActive && (targetStage === 'WON' || targetStage === 'LOST')) {
    return { allowed: true };
  }

  const targetIndex = ACTIVE_STAGES_ORDER.indexOf(targetStage as OpportunityStage);

  // Không được chuyển lùi
  if (targetIndex !== -1 && targetIndex < currentIndex) {
    return {
      allowed: false,
      reason: `Không thể chuyển lùi từ ${STAGE_CONFIGS[currentStage as OpportunityStage]?.shortLabel ?? currentStage} về ${STAGE_CONFIGS[targetStage as OpportunityStage]?.shortLabel ?? targetStage}`,
    };
  }

  // Không được nhảy cóc (phải đúng bước kế tiếp liền kề: targetIndex === currentIndex + 1)
  if (targetIndex !== currentIndex + 1) {
    const nextAllowed = ACTIVE_STAGES_ORDER[currentIndex + 1];
    return {
      allowed: false,
      reason: `Quy tắc QTN-06: Không thể nhảy cóc. Giai đoạn kế tiếp hợp lệ là ${STAGE_CONFIGS[nextAllowed]?.shortLabel ?? nextAllowed}.`,
    };
  }

  return { allowed: true };
}

/**
 * Lấy danh sách các giai đoạn tiếp theo hợp lệ mà cơ hội có thể chuyển tới
 */
export function getNextAllowedStages(
  currentStage: OpportunityStage | string,
  status?: string
): OpportunityStage[] {
  if (status === 'CLOSED' || currentStage === 'WON' || currentStage === 'LOST') {
    return [];
  }

  if (currentStage === 'APPROACH') {
    return ['PROPOSAL'];
  }

  if (currentStage === 'PROPOSAL') {
    return ['NEGOTIATION'];
  }

  if (currentStage === 'NEGOTIATION') {
    return ['WON', 'LOST'];
  }

  return [];
}

/**
 * Định dạng số tiền VNĐ có phân cách hàng nghìn (ví dụ: 500000000 -> "500.000.000")
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
 * Chuyển số tiền VNĐ thành chữ tiếng Việt
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
