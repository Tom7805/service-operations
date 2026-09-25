import { describe, expect, it } from 'vitest';
import {
  generateTemporaryPassword,
  suggestUsername,
  validatePassword,
  validatePortalAccountForm,
  validateStatusReason,
  validateUsername,
} from '../validators/portalAccountValidators';

describe('portalAccountValidators (NCL-13-CN-001)', () => {
  it('tên đăng nhập: 3–100 ký tự, chỉ chữ không dấu, số và . _ @ -', () => {
    expect(validateUsername('')).toMatch(/không được để trống/);
    expect(validateUsername('ab')).toMatch(/từ 3 đến 100/);
    expect(validateUsername('a'.repeat(101))).toMatch(/từ 3 đến 100/);
    expect(validateUsername('nhi abc')).toMatch(/chỉ gồm/);
    expect(validateUsername('nhì.abc')).toMatch(/chỉ gồm/);
    expect(validateUsername('nhi.abc')).toBeUndefined();
    expect(validateUsername('nhi_abc@kh-1')).toBeUndefined();
  });

  it('mật khẩu: 8–100 ký tự, có chữ cái và chữ số', () => {
    expect(validatePassword('')).toMatch(/không được để trống/);
    expect(validatePassword('Ab1')).toMatch(/từ 8 đến 100/);
    expect(validatePassword('abcdefgh')).toMatch(/chữ số/);
    expect(validatePassword('12345678')).toMatch(/chữ cái/);
    expect(validatePassword('Matkhau123')).toBeUndefined();
  });

  it('form: bắt buộc chọn người liên hệ và mật khẩu nhập lại phải khớp', () => {
    expect(
      validatePortalAccountForm({ contactId: null, username: 'nhi.abc', password: 'Matkhau123', confirmPassword: 'Matkhau123' })
        .errors.contactId
    ).toBeDefined();
    expect(
      validatePortalAccountForm({ contactId: 1, username: 'nhi.abc', password: 'Matkhau123', confirmPassword: 'x' }).errors
        .confirmPassword
    ).toBe('Mật khẩu nhập lại không khớp');
    expect(
      validatePortalAccountForm({ contactId: 1, username: 'nhi.abc', password: 'Matkhau123', confirmPassword: 'Matkhau123' })
    ).toEqual({ isValid: true, errors: {} });
  });

  it('lý do đổi trạng thái tối đa 500 ký tự', () => {
    expect(validateStatusReason('a'.repeat(500))).toBeUndefined();
    expect(validateStatusReason('a'.repeat(501))).toMatch(/500/);
  });

  it('gợi ý tên đăng nhập từ email hoặc họ tên, bỏ dấu và ký tự không hợp lệ', () => {
    expect(suggestUsername('nhi@abc.example', 'Nguyễn Thị Nhi')).toBe('nhi');
    expect(suggestUsername(null, 'Nguyễn Thị Đào')).toBe('nguyen.thi.dao');
    expect(suggestUsername('', '  Trần   Văn B ')).toBe('tran.van.b');
    expect(suggestUsername('b@abc.example', 'Trần Văn B')).toBe('tran.van.b');
    expect(validateUsername(suggestUsername(null, 'Lê Văn Cường'))).toBeUndefined();
  });

  it('mật khẩu tạm sinh ra luôn đạt luật', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(validatePassword(generateTemporaryPassword())).toBeUndefined();
    }
  });
});
