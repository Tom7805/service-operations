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
    it('báo lỗi khi tên cơ hội bị để trống hoặc chỉ có khoảng trắng', () => {
      const payload: OpportunityCreatePayload = {
        name: '   ',
        customerId: 1,
        expectedValue: 500000000,
      };

      const errors = validateOpportunityCreate(payload);
      expect(errors.name).toBe('Tên cơ hội không được để trống');
    });

    it('báo lỗi khi tên cơ hội vượt quá 255 ký tự', () => {
      const longName = 'A'.repeat(OPPORTUNITY_LIMITS.NAME_MAX_LENGTH + 1);
      const payload: OpportunityCreatePayload = {
        name: longName,
        customerId: 1,
        expectedValue: 500000000,
      };

      const errors = validateOpportunityCreate(payload);
      expect(errors.name).toContain('Tên cơ hội không được vượt quá 255 ký tự');
    });

    it('báo lỗi khi chưa chọn khách hàng hoặc customerId không hợp lệ (TC-01)', () => {
      const payloadMissingCustomer: OpportunityCreatePayload = {
        name: 'Triển khai giải pháp ERP',
        customerId: 0,
        expectedValue: 500000000,
      };

      const errors = validateOpportunityCreate(payloadMissingCustomer);
      expect(errors.customerId).toBe('Vui lòng chọn khách hàng cho cơ hội bán hàng');
    });

    it('báo lỗi khi giá trị dự kiến bị để trống (TC-02)', () => {
      const payload: OpportunityCreatePayload = {
        name: 'Triển khai giải pháp ERP',
        customerId: 10,
        expectedValue: (undefined as unknown) as number,
      };

      const errors = validateOpportunityCreate(payload);
      expect(errors.expectedValue).toBe('Giá trị dự kiến không được để trống');
    });

    it('báo lỗi khi giá trị dự kiến bằng 0 hoặc âm (TC-02)', () => {
      const payloadZero: OpportunityCreatePayload = {
        name: 'Triển khai giải pháp ERP',
        customerId: 10,
        expectedValue: 0,
      };
      const errorsZero = validateOpportunityCreate(payloadZero);
      expect(errorsZero.expectedValue).toBe('Giá trị dự kiến phải là số dương lớn hơn 0');

      const payloadNegative: OpportunityCreatePayload = {
        name: 'Triển khai giải pháp ERP',
        customerId: 10,
        expectedValue: -15000000,
      };
      const errorsNegative = validateOpportunityCreate(payloadNegative);
      expect(errorsNegative.expectedValue).toBe('Giá trị dự kiến phải là số dương lớn hơn 0');
    });

    it('báo lỗi khi ngày dự kiến chốt không đúng định dạng YYYY-MM-DD', () => {
      const payload: OpportunityCreatePayload = {
        name: 'Triển khai giải pháp ERP',
        customerId: 10,
        expectedValue: 500000000,
        expectedCloseDate: '31-12-2026',
      };

      const errors = validateOpportunityCreate(payload);
      expect(errors.expectedCloseDate).toBe('Ngày dự kiến chốt không đúng định dạng YYYY-MM-DD');
    });

    it('hợp lệ khi tất cả dữ liệu bắt buộc đều chính xác và đầy đủ', () => {
      const validPayload: OpportunityCreatePayload = {
        name: 'Triển khai giải pháp ERP cho Công ty TNHH ABC',
        customerId: 10,
        expectedValue: 500000000,
        expectedCloseDate: '2026-12-31',
      };

      const errors = validateOpportunityCreate(validPayload);
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('Định dạng tiền tệ VNĐ và đọc số thành chữ', () => {
    it('formatVNDInput định dạng phân cách hàng nghìn bằng dấu chấm', () => {
      expect(formatVNDInput(500000000)).toBe('500.000.000');
      expect(formatVNDInput('1250000')).toBe('1.250.000');
      expect(formatVNDInput('')).toBe('');
    });

    it('parseVNDInput chuyển đổi chuỗi định dạng về số nguyên', () => {
      expect(parseVNDInput('500.000.000')).toBe(500000000);
      expect(parseVNDInput('1.250.000')).toBe(1250000);
      expect(parseVNDInput('')).toBe(0);
    });

    it('convertVNDToWords đọc đúng số tiền thành chữ tiếng Việt chuẩn mực', () => {
      expect(convertVNDToWords(500000000)).toBe('Năm trăm triệu đồng');
      expect(convertVNDToWords(1500000000)).toBe('Một tỷ năm trăm triệu đồng');
      expect(convertVNDToWords(0)).toBe('');
    });
  });
});
