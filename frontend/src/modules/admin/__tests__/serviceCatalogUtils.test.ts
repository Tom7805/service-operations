import { describe, expect, it } from 'vitest';
import {
  normalizeServiceName,
  parsePriceInput,
  validateDate,
  validatePrice,
  validateServiceInfo,
} from '../utils/serviceCatalogUtils';

describe('serviceCatalogUtils (NCL-15-CN-001)', () => {
  it('đọc giá kiểu Việt Nam: chấm hàng nghìn, phẩy thập phân', () => {
    expect(parsePriceInput('450000')).toBe(450000);
    expect(parsePriceInput('450.000')).toBe(450000);
    expect(parsePriceInput('1.250.000,5')).toBe(1250000.5);
    expect(parsePriceInput('99.5')).toBe(99.5);
    expect(parsePriceInput(' 12 000 ')).toBe(12000);
    expect(parsePriceInput('abc')).toBeNull();
    expect(parsePriceInput('')).toBeNull();
  });

  it('kiểm tra giá khớp ràng buộc backend (> 0, 16 số nguyên, 2 số thập phân)', () => {
    expect(validatePrice('')).toMatch(/Nhập giá/);
    expect(validatePrice('0')).toMatch(/lớn hơn 0/);
    expect(validatePrice('-5')).toMatch(/là số/);
    expect(validatePrice('10.123')).toBeNull(); // 10.123 = mười nghìn một trăm hai mươi ba (hàng nghìn)
    expect(validatePrice('10,123')).toMatch(/2 chữ số thập phân/);
    expect(validatePrice('1'.repeat(17))).toMatch(/16 chữ số/);
    expect(validatePrice('1'.repeat(16))).toBeNull();
    expect(validatePrice('450000,50')).toBeNull();
  });

  it('kiểm tra thông tin dịch vụ bắt buộc và độ dài', () => {
    expect(validateServiceInfo({ name: ' ', unit: '', description: '' })).toEqual({
      name: 'Nhập tên dịch vụ.',
      unit: 'Nhập đơn vị tính.',
    });
    expect(validateServiceInfo({ name: 'a'.repeat(256), unit: 'u'.repeat(51), description: 'd'.repeat(1001) })).toMatchObject({
      name: expect.stringMatching(/255/),
      unit: expect.stringMatching(/50/),
      description: expect.stringMatching(/1000/),
    });
    expect(validateServiceInfo({ name: 'Tư vấn', unit: 'giờ', description: '' })).toEqual({});
  });

  it('chuẩn hóa tên để so trùng: bỏ hoa thường/khoảng trắng thừa nhưng giữ dấu (TC-02)', () => {
    expect(normalizeServiceName('  Tư vấn   TRIỂN khai ')).toBe(normalizeServiceName('tư vấn triển khai'));
    expect(normalizeServiceName('Bảo trì')).not.toBe(normalizeServiceName('Bao tri'));
  });

  it('kiểm tra ngày hiệu lực', () => {
    expect(validateDate('')).toMatch(/Chọn ngày hiệu lực/);
    expect(validateDate('2026-13-45')).toMatch(/không hợp lệ/);
    expect(validateDate('2026-07-01')).toBeNull();
  });
});
