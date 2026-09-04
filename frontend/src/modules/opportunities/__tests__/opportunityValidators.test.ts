import { describe, expect, it } from 'vitest';
import {
  validateOpportunityCreate,
  validateQuoteCreate,
  canTransitionStage,
  getNextAllowedStages,
  formatVNDInput,
  parseVNDInput,
  convertVNDToWords,
} from '../validators/opportunityValidators';
import type { OpportunityCreatePayload, QuoteItemReq } from '../types/opportunityTypes';

describe('opportunityValidators (NCL-03-CN-001, NCL-03-CN-002, NCL-03-CN-003)', () => {
  describe('validateQuoteCreate (NCL-03-CN-003-CV-03 / TC-02)', () => {
    it('báo lỗi khi danh sách dòng báo giá rỗng hoặc không phải mảng', () => {
      const resultEmpty = validateQuoteCreate([]);
      expect(resultEmpty.valid).toBe(false);
      expect(resultEmpty.generalError).toContain('phải có ít nhất một dòng chuyên môn');

      const resultNull = validateQuoteCreate(null as unknown as QuoteItemReq[]);
      expect(resultNull.valid).toBe(false);
    });

    it('báo lỗi khi để trống vai trò chuyên môn hoặc số ngày công <= 0', () => {
      const items: QuoteItemReq[] = [
        { professionalRole: '', workDays: 10 },
        { professionalRole: 'Kỹ sư phần mềm', workDays: 0 },
        { professionalRole: 'Tester', workDays: -5 },
      ];

      const result = validateQuoteCreate(items);
      expect(result.valid).toBe(false);
      expect(result.fieldErrors['items[0].professionalRole']).toBe('Vai trò chuyên môn không được để trống');
      expect(result.fieldErrors['items[1].workDays']).toBe('Số ngày công phải lớn hơn 0');
      expect(result.fieldErrors['items[2].workDays']).toBe('Số ngày công phải lớn hơn 0');
    });

    it('báo lỗi khi số ngày công vượt quá giới hạn 3650 ngày', () => {
      const items: QuoteItemReq[] = [
        { professionalRole: 'Chuyên gia tư vấn', workDays: 4000 },
      ];

      const result = validateQuoteCreate(items);
      expect(result.valid).toBe(false);
      expect(result.fieldErrors['items[0].workDays']).toContain('không được vượt quá 3650');
    });

    it('hợp lệ khi tất cả các dòng đều có vai trò và ngày công dương', () => {
      const items: QuoteItemReq[] = [
        { professionalRole: 'Kỹ sư kiến trúc giải pháp', workDays: 15 },
        { professionalRole: 'Lập trình viên Fullstack', workDays: 45.5 },
      ];

      const result = validateQuoteCreate(items);
      expect(result.valid).toBe(true);
      expect(result.generalError).toBeUndefined();
      expect(Object.keys(result.fieldErrors)).toHaveLength(0);
    });
  });

  describe('convertVNDToWords & Currency formatters', () => {
    it('chuyển đổi số tiền VND sang chữ tiếng Việt chuẩn mực', () => {
      expect(convertVNDToWords(0)).toBe('Không đồng');
      expect(convertVNDToWords(1_000_000)).toBe('Một triệu đồng');
      expect(convertVNDToWords(15_500_000)).toBe('Mười lăm triệu năm trăm nghìn đồng');
      expect(convertVNDToWords(120_000_000)).toBe('Một trăm hai mươi triệu đồng');
    });

    it('formatVNDInput và parseVNDInput hoạt động chính xác', () => {
      expect(formatVNDInput(1500000)).toBe('1.500.000');
      expect(parseVNDInput('1.500.000')).toBe(1500000);
      expect(parseVNDInput('abc')).toBe(0);
      expect(parseVNDInput('')).toBe(0);
    });
  });

  describe('canTransitionStage (QTN-06 & NCL-03-CN-002)', () => {
    it('cho phép chuyển tiếp tuần tự theo ACTIVE_STAGES_ORDER', () => {
      expect(canTransitionStage('APPROACH', 'PROPOSAL').allowed).toBe(true);
      expect(canTransitionStage('PROPOSAL', 'NEGOTIATION').allowed).toBe(true);
      expect(canTransitionStage('NEGOTIATION', 'WON').allowed).toBe(true);
      expect(canTransitionStage('NEGOTIATION', 'LOST').allowed).toBe(true);
    });

    it('chặn nhảy cóc qua giai đoạn', () => {
      const skipCheck = canTransitionStage('APPROACH', 'NEGOTIATION');
      expect(skipCheck.allowed).toBe(false);
      expect(skipCheck.reason).toContain('Không thể nhảy cóc');
    });

    it('chặn quay lui về giai đoạn trước đó', () => {
      const rollbackCheck = canTransitionStage('NEGOTIATION', 'PROPOSAL');
      expect(rollbackCheck.allowed).toBe(false);
      expect(rollbackCheck.reason).toContain('Không thể chuyển lùi');
    });

    it('chặn đổi giai đoạn khi cơ hội đã đóng (WON hoặc LOST)', () => {
      expect(canTransitionStage('WON', 'NEGOTIATION', 'CLOSED').allowed).toBe(false);
      expect(canTransitionStage('LOST', 'PROPOSAL', 'CLOSED').allowed).toBe(false);
    });

    it('getNextAllowedStages trả về danh sách các bước kế tiếp hợp lệ', () => {
      expect(getNextAllowedStages('APPROACH')).toEqual(['PROPOSAL']);
      expect(getNextAllowedStages('PROPOSAL')).toEqual(['NEGOTIATION']);
      expect(getNextAllowedStages('NEGOTIATION')).toEqual(['WON', 'LOST']);
      expect(getNextAllowedStages('WON')).toEqual([]);
    });
  });

  describe('validateOpportunityCreate (NCL-03-CN-001)', () => {
    it('báo lỗi khi thiếu tên, khách hàng, hoặc giá trị dự kiến', () => {
      const payload: OpportunityCreatePayload = {
        name: '',
        customerId: 0,
        expectedValue: 0,
      };

      const errors = validateOpportunityCreate(payload);
      expect(errors.name).toBe('Tên cơ hội không được để trống');
      expect(errors.customerId).toBe('Vui lòng chọn khách hàng cho cơ hội bán hàng');
      expect(errors.expectedValue).toBe('Giá trị dự kiến phải là số dương lớn hơn 0');
    });

    it('hợp lệ khi đủ các trường bắt buộc', () => {
      const payload: OpportunityCreatePayload = {
        name: 'Triển khai CRM cho Ngân hàng X',
        customerId: 12,
        expectedValue: 500_000_000,
        expectedCloseDate: '2026-12-31',
      };

      const errors = validateOpportunityCreate(payload);
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });
});
