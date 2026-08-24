export interface ChangePasswordFormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface ForgotPasswordFormErrors {
  email?: string;
}

export interface ResetPasswordFormErrors {
  newPassword?: string;
  confirmPassword?: string;
}

const PASSWORD_MIN_LENGTH = 8;
const HAS_LETTER = /[A-Za-z]/;
const HAS_DIGIT = /[0-9]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Khớp với PasswordPolicyValidator phía backend: tối thiểu 8 ký tự, có chữ và số. */
function isValidPasswordShape(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && HAS_LETTER.test(password) && HAS_DIGIT.test(password);
}

export function validateChangePasswordForm(values: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): ChangePasswordFormErrors {
  const errors: ChangePasswordFormErrors = {};

  if (!values.currentPassword) {
    errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
  }

  if (!values.newPassword) {
    errors.newPassword = 'Vui lòng nhập mật khẩu mới';
  } else if (!isValidPasswordShape(values.newPassword)) {
    errors.newPassword = 'Mật khẩu mới phải có ít nhất 8 ký tự, gồm cả chữ và số';
  } else if (values.currentPassword && values.newPassword === values.currentPassword) {
    errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
  }

  if (values.newPassword && values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Xác nhận mật khẩu không khớp';
  }

  return errors;
}

export function validateForgotPasswordForm(values: { email: string }): ForgotPasswordFormErrors {
  const errors: ForgotPasswordFormErrors = {};

  if (!values.email || !values.email.trim()) {
    errors.email = 'Vui lòng nhập email';
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'Email không hợp lệ';
  }

  return errors;
}

export function validateResetPasswordForm(values: {
  newPassword: string;
  confirmPassword: string;
}): ResetPasswordFormErrors {
  const errors: ResetPasswordFormErrors = {};

  if (!values.newPassword) {
    errors.newPassword = 'Vui lòng nhập mật khẩu mới';
  } else if (!isValidPasswordShape(values.newPassword)) {
    errors.newPassword = 'Mật khẩu mới phải có ít nhất 8 ký tự, gồm cả chữ và số';
  }

  if (values.newPassword && values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Xác nhận mật khẩu không khớp';
  }

  return errors;
}
