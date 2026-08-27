import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_VALIDATION_LIMITS,
  validateCustomerCreate,
  validateDuplicateOverrideReason,
} from '../validators/customerValidators';

describe('Customer Validators (NCL-02-CN-001 & NCL-02-CN-002)', () => {
  describe('validateCustomerCreate', () => {
    it('báo lỗi khi trường tên khách hàng bị trống hoặc undefined', () => {
      const resultEmpty = validateCustomerCreate({ name: '' });
      expect(resultEmpty.name).toBe('Tên khách hàng không được để trống');

      const resultUndefined = validateCustomerCreate({});
      expect(resultUndefined.name).toBe('Tên khách hàng không được để trống');
    });

    it('báo lỗi khi tên khách hàng chỉ toàn khoảng trắng (whitespace-only)', () => {
      const result = validateCustomerCreate({ name: '    \t\n  ' });
      expect(result.name).toBe('Tên khách hàng không được để trống');
    });

    it('báo lỗi khi tên khách hàng vượt quá giới hạn 255 ký tự', () => {
      const longName = 'A'.repeat(CUSTOMER_VALIDATION_LIMITS.NAME_MAX_LENGTH + 1);
      const result = validateCustomerCreate({ name: longName });
      expect(result.name).toContain('không được vượt quá 255 ký tự');
    });

    it('hợp lệ khi tên khách hàng đúng 255 ký tự', () => {
      const exactName = 'A'.repeat(CUSTOMER_VALIDATION_LIMITS.NAME_MAX_LENGTH);
      const result = validateCustomerCreate({ name: exactName });
      expect(result.name).toBeUndefined();
    });

    it('báo lỗi khi mã số thuế vượt quá 50 ký tự', () => {
      const longTaxCode = '1234567890'.repeat(6); // 60 chars
      const result = validateCustomerCreate({
        name: 'Công ty Hợp lệ',
        taxCode: longTaxCode,
      });
      expect(result.taxCode).toContain('không được vượt quá 50 ký tự');
    });

    it('báo lỗi khi số điện thoại vượt quá 30 ký tự (NCL-02-CN-002)', () => {
      const longPhone = '0987654321'.repeat(4); // 40 chars
      const result = validateCustomerCreate({
        name: 'Công ty Hợp lệ',
        phone: longPhone,
      });
      expect(result.phone).toContain('không được vượt quá 30 ký tự');
    });

    it('báo lỗi khi ngành nghề vượt quá 255 ký tự', () => {
      const longIndustry = 'Công nghệ '.repeat(30); // > 255 chars
      const result = validateCustomerCreate({
        name: 'Công ty Hợp lệ',
        industry: longIndustry,
      });
      expect(result.industry).toContain('không được vượt quá 255 ký tự');
    });

    it('báo lỗi khi địa chỉ vượt quá 500 ký tự', () => {
      const longAddress = 'Địa chỉ số '.repeat(60); // > 500 chars
      const result = validateCustomerCreate({
        name: 'Công ty Hợp lệ',
        address: longAddress,
      });
      expect(result.address).toContain('không được vượt quá 500 ký tự');
    });

    it('hợp lệ hoàn toàn (happy path) với đầy đủ thông tin chuẩn', () => {
      const result = validateCustomerCreate({
        name: 'Công ty TNHH Phần mềm ABC',
        taxCode: '0101234567',
        phone: '0987654321',
        industry: 'Công nghệ thông tin',
        address: 'Hà Nội, Việt Nam',
      });
      expect(Object.keys(result).length).toBe(0);
    });

    it('hợp lệ khi chỉ điền trường bắt buộc là Tên khách hàng (các trường khác bỏ trống)', () => {
      const result = validateCustomerCreate({
        name: 'Doanh nghiệp Tư nhân XYZ',
      });
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('validateDuplicateOverrideReason (NCL-02-CN-002, TC-02)', () => {
    it('báo lỗi khi để trống lý do hoặc chỉ toàn khoảng trắng', () => {
      expect(validateDuplicateOverrideReason('')).toBe(
        'Phải ghi lý do khi bỏ qua cảnh báo trùng hồ sơ'
      );
      expect(validateDuplicateOverrideReason('   \t\n  ')).toBe(
        'Phải ghi lý do khi bỏ qua cảnh báo trùng hồ sơ'
      );
    });

    it('báo lỗi khi lý do vượt quá 1000 ký tự', () => {
      const longReason = 'A'.repeat(CUSTOMER_VALIDATION_LIMITS.OVERRIDE_REASON_MAX_LENGTH + 1);
      const error = validateDuplicateOverrideReason(longReason);
      expect(error).toContain('không được vượt quá 1000 ký tự');
    });

    it('hợp lệ khi nhập lý do đầy đủ và đúng quy chuẩn', () => {
      const validReason = 'Hai công ty khác nhau, chỉ cùng người đại diện pháp luật';
      expect(validateDuplicateOverrideReason(validReason)).toBeNull();
    });
  });
});

