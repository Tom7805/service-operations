import { describe, expect, it } from 'vitest';
import {
  validateTaskCreateForm,
  validateWorkPackageForm,
} from '../projectValidators';

describe('projectValidators - WBS & Tasks (NCL-05-CN-002)', () => {
  describe('validateWorkPackageForm', () => {
    it('returns error when package name is empty or whitespaces only', () => {
      const res1 = validateWorkPackageForm({ name: '' });
      expect(res1.isValid).toBe(false);
      expect(res1.errors.name).toContain('Tên hạng mục không được để trống');

      const res2 = validateWorkPackageForm({ name: '   ' });
      expect(res2.isValid).toBe(false);
      expect(res2.errors.name).toContain('Tên hạng mục không được để trống');
    });

    it('returns error when package name exceeds 255 characters', () => {
      const res = validateWorkPackageForm({ name: 'a'.repeat(256) });
      expect(res.isValid).toBe(false);
      expect(res.errors.name).toContain('không được vượt quá 255 ký tự');
    });

    it('returns empty errors object when package form is valid', () => {
      const res = validateWorkPackageForm({
        name: 'Giai đoạn 1: Khảo sát & Phân tích',
        description: 'Mô tả chi tiết',
      });
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors)).toHaveLength(0);
    });
  });

  describe('validateTaskCreateForm', () => {
    it('returns error when task name is empty or whitespace', () => {
      const res = validateTaskCreateForm({ name: '   ' });
      expect(res.isValid).toBe(false);
      expect(res.errors.name).toContain('Tên công việc không được để trống');
    });

    it('returns error when task name exceeds 255 characters', () => {
      const res = validateTaskCreateForm({ name: 'x'.repeat(256) });
      expect(res.isValid).toBe(false);
      expect(res.errors.name).toContain('không được vượt quá 255 ký tự');
    });

    it('returns error when expectedEndDate is before expectedStartDate', () => {
      const res = validateTaskCreateForm({
        name: 'Thiết kế cơ sở dữ liệu',
        expectedStartDate: '2026-05-15',
        expectedEndDate: '2026-05-10',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.expectedEndDate).toContain('Ngày kết thúc dự kiến không được sớm hơn ngày bắt đầu');
    });

    it('passes when dates are equal or end date is after start date', () => {
      const resEqual = validateTaskCreateForm({
        name: 'Họp kick-off',
        expectedStartDate: '2026-05-10',
        expectedEndDate: '2026-05-10',
      });
      expect(resEqual.isValid).toBe(true);
      expect(Object.keys(resEqual.errors)).toHaveLength(0);

      const resAfter = validateTaskCreateForm({
        name: 'Phát triển backend API',
        expectedStartDate: '2026-05-10',
        expectedEndDate: '2026-05-20',
      });
      expect(resAfter.isValid).toBe(true);
      expect(Object.keys(resAfter.errors)).toHaveLength(0);
    });

    it('passes when dates are omitted or partially provided', () => {
      const resNoDates = validateTaskCreateForm({
        name: 'Công việc không xác định thời hạn',
      });
      expect(resNoDates.isValid).toBe(true);
      expect(Object.keys(resNoDates.errors)).toHaveLength(0);

      const resOnlyStart = validateTaskCreateForm({
        name: 'Công việc chỉ có ngày bắt đầu',
        expectedStartDate: '2026-06-01',
      });
      expect(resOnlyStart.isValid).toBe(true);
      expect(Object.keys(resOnlyStart.errors)).toHaveLength(0);
    });
  });
});
