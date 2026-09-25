import {
  PORTAL_PASSWORD_MAX,
  PORTAL_PASSWORD_MIN,
  PORTAL_REASON_MAX,
  PORTAL_USERNAME_MAX,
  PORTAL_USERNAME_MIN,
} from '../types/portalAccountTypes';

/** Cùng biểu thức với `PortalAccountCreateReq.username` ở backend. */
export const PORTAL_USERNAME_PATTERN = /^[A-Za-z0-9._@-]+$/;

export interface PortalAccountFormErrors {
  contactId?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

export interface PortalAccountFormInput {
  contactId: number | null;
  username: string;
  password: string;
  confirmPassword: string;
}

/** Từng luật mật khẩu (cùng luật `NCL-01-CN-008`) — hiển thị thành danh sách đạt/chưa đạt dưới ô nhập. */
export function passwordRules(password: string) {
  return [
    {
      key: 'length',
      label: `Từ ${PORTAL_PASSWORD_MIN} đến ${PORTAL_PASSWORD_MAX} ký tự`,
      ok: password.length >= PORTAL_PASSWORD_MIN && password.length <= PORTAL_PASSWORD_MAX,
    },
    { key: 'letter', label: 'Có ít nhất một chữ cái (a–z, A–Z)', ok: /[A-Za-z]/.test(password) },
    { key: 'digit', label: 'Có ít nhất một chữ số (0–9)', ok: /[0-9]/.test(password) },
  ];
}

export function validateUsername(value: string): string | undefined {
  const username = value.trim();
  if (!username) return 'Tên đăng nhập không được để trống';
  if (username.length < PORTAL_USERNAME_MIN || username.length > PORTAL_USERNAME_MAX) {
    return `Tên đăng nhập dài từ ${PORTAL_USERNAME_MIN} đến ${PORTAL_USERNAME_MAX} ký tự`;
  }
  if (!PORTAL_USERNAME_PATTERN.test(username)) {
    return 'Tên đăng nhập chỉ gồm chữ không dấu, chữ số và các ký tự . _ @ -';
  }
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Mật khẩu không được để trống';
  const failed = passwordRules(password).find((rule) => !rule.ok);
  return failed ? `Mật khẩu chưa đạt: ${failed.label.toLowerCase()}` : undefined;
}

export function validatePortalAccountForm(input: PortalAccountFormInput): {
  isValid: boolean;
  errors: PortalAccountFormErrors;
} {
  const errors: PortalAccountFormErrors = {};
  if (input.contactId == null) errors.contactId = 'Chọn người liên hệ được cấp tài khoản';
  errors.username = validateUsername(input.username);
  errors.password = validatePassword(input.password);
  if (!errors.password && input.confirmPassword !== input.password) {
    errors.confirmPassword = 'Mật khẩu nhập lại không khớp';
  }
  (Object.keys(errors) as Array<keyof PortalAccountFormErrors>).forEach((k) => {
    if (!errors[k]) delete errors[k];
  });
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateStatusReason(reason: string): string | undefined {
  return reason.trim().length > PORTAL_REASON_MAX ? `Lý do tối đa ${PORTAL_REASON_MAX} ký tự` : undefined;
}

/**
 * Gợi ý tên đăng nhập từ email người liên hệ (phần trước @) hoặc họ tên, bỏ dấu tiếng Việt và ký tự không hợp lệ.
 * Chỉ là gợi ý — Quản trị viên sửa được; trùng tên vẫn do backend chặn (409).
 */
export function suggestUsername(email: string | null | undefined, fullName: string | null | undefined): string {
  const normalize = (source: string) =>
    source
      .trim()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9._@-]/g, '')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, PORTAL_USERNAME_MAX);
  const fromEmail = normalize((email ?? '').split('@')[0] ?? '');
  // Phần trước @ quá ngắn (vd "b@...") thì không đạt độ dài tối thiểu — dùng họ tên thay thế.
  if (fromEmail.length >= PORTAL_USERNAME_MIN) return fromEmail;
  const fromName = normalize(fullName ?? '');
  return fromName.length >= fromEmail.length ? fromName : fromEmail;
}

/** Sinh mật khẩu tạm 12 ký tự luôn đạt luật (có chữ hoa, chữ thường, chữ số), bỏ các ký tự dễ nhầm (0/O, 1/l/I). */
export function generateTemporaryPassword(random: () => number = Math.random): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const pick = (set: string) => set[Math.floor(random() * set.length) % set.length];
  const chars = [pick(upper), pick(lower), pick(digits)];
  while (chars.length < 12) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1)) % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
