import { describe, it, expect } from 'vitest';
import {
  validateOpportunityCreate,
  canTransitionStage,
  getNextAllowedStages,
  formatVNDInput,
  parseVNDInput,
  convertVNDToWords,
  OPPORTUNITY_LIMITS,
} from '../validators/opportunityValidators';
import type { OpportunityCreatePayload } from '../types/opportunityTypes';

describe('Opportunity Validators & Stage Transition (NCL-03-CN-001 & NCL-03-CN-002)', () => {
  describe('canTransitionStage (QTN-06, TC-02, TC-03)', () => {
    it('TC-02: cho phép chuyển giai đoạn kế tiếp liền kề (APPROACH -> PROPOSAL)', () => {
      const result = canTransitionStage('APPROACH', 'PROPOSAL', 'OPEN');
      expect(result.allowed).toBe(true);
    });

    it('TC-02: cho phép chuyển giai đoạn kế tiếp liền kề (PROPOSAL -> NEGOTIATION)', () => {
      const result = canTransitionStage('PROPOSAL', 'NEGOTIATION', 'OPEN');
      expect(result.allowed).toBe(true);
    });

    it('TC-02: từ NEGOTIATION cho phép chốt sang WON hoặc LOST', () => {
      const wonResult = canTransitionStage('NEGOTIATION', 'WON', 'OPEN');
      expect(wonResult.allowed).toBe(true);

      const lostResult = canTransitionStage('NEGOTIATION', 'LOST', 'OPEN');
      expect(lostResult.allowed).toBe(true);
    });

    it('TC-02: từ chối nhảy cóc (APPROACH -> NEGOTIATION hoặc APPROACH -> WON)', () => {
      const skipToNego = canTransitionStage('APPROACH', 'NEGOTIATION', 'OPEN');
      expect(skipToNego.allowed).toBe(false);
      expect(skipToNego.reason).toContain('Không thể nhảy cóc');

      const skipToWon = canTransitionStage('APPROACH', 'WON', 'OPEN');
      expect(skipToWon.allowed).toBe(false);
      expect(skipToWon.reason).toContain('Không thể nhảy cóc');
    });

    it('TC-02: từ chối chuyển lùi (PROPOSAL -> APPROACH hoặc NEGOTIATION -> PROPOSAL)', () => {
      const backResult = canTransitionStage('PROPOSAL', 'APPROACH', 'OPEN');
      expect(backResult.allowed).toBe(false);
      expect(backResult.reason).toContain('Không thể chuyển lùi');
    });

    it('TC-03: từ chối chuyển giai đoạn khi cơ hội đã đóng (status = CLOSED)', () => {
      const closedResult = canTransitionStage('WON', 'PROPOSAL', 'CLOSED');
      expect(closedResult.allowed).toBe(false);
      expect(closedResult.reason).toContain('Cơ hội đã hoàn tất và đóng');
    });

    it('cho phép giữ nguyên giai đoạn hiện tại (current === target)', () => {
      const sameResult = canTransitionStage('PROPOSAL', 'PROPOSAL', 'OPEN');
      expect(sameResult.allowed).toBe(true);
    });
  });

  describe('getNextAllowedStages', () => {
    it('trả về đúng danh sách giai đoạn kế tiếp theo từng nấc', () => {
      expect(getNextAllowedStages('APPROACH', 'OPEN')).toEqual(['PROPOSAL']);
      expect(getNextAllowedStages('PROPOSAL', 'OPEN')).toEqual(['NEGOTIATION']);
      expect(getNextAllowedStages('NEGOTIATION', 'OPEN')).toEqual(['WON', 'LOST']);
      expect(getNextAllowedStages('WON', 'CLOSED')).toEqual([]);
      expect(getNextAllowedStages('LOST', 'CLOSED')).toEqual([]);
    });
  });

  describe('validateOpportunityCreate (NCL-03-CN-001)', () => {
    it('báo lỗi khi tên cơ hội để trống hoặc vượt quá 255 ký tự', () => {
      const emptyErrors = validateOpportunityCreate({
        name: '',
        customerId: 1,
        expectedValue: 100000000,
      });
      expect(emptyErrors.name).toBe('Tên cơ hội không được để trống');

      const longErrors = validateOpportunityCreate({
        name: 'A'.repeat(OPPORTUNITY_LIMITS.NAME_MAX_LENGTH + 1),
        customerId: 1,
        expectedValue: 100000000,
      });
      expect(longErrors.name).toContain('Tên cơ hội không được vượt quá 255 ký tự');
    });

    it('báo lỗi khi chưa chọn khách hàng (TC-01)', () => {
      const errors = validateOpportunityCreate({
        name: 'Cơ hội phần mềm',
        customerId: 0,
        expectedValue: 100000000,
      });
      expect(errors.customerId).toBe('Vui lòng chọn khách hàng cho cơ hội bán hàng');
    });

    it('báo lỗi khi giá trị dự kiến <= 0 (TC-02)', () => {
      const errors = validateOpportunityCreate({
        name: 'Cơ hội phần mềm',
        customerId: 1,
        expectedValue: 0,
      });
      expect(errors.expectedValue).toBe('Giá trị dự kiến phải là số dương lớn hơn 0');
    });
  });

  describe('Định dạng tiền tệ VNĐ', () => {
    it('formatVNDInput và parseVNDInput hoạt động chính xác', () => {
      expect(formatVNDInput(500000000)).toBe('500.000.000');
      expect(parseVNDInput('500.000.000')).toBe(500000000);
      expect(convertVNDToWords(500000000)).toBe('Năm trăm triệu đồng');
    });
  });
});
