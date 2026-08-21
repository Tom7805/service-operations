import type { CreateUserPayload, UpdateUserPayload } from '../types/userTypes';

export interface FormErrors {
  username?: string;
  fullName?: string;
  email?: string;
  password?: string;
  roleCodes?: string;
  departmentId?: string;
}

export function validateCreateUser(payload: Partial<CreateUserPayload>): FormErrors {
  const errors: FormErrors = {};

  if (!payload.username || !payload.username.trim()) {
    errors.username = 'Tên tài khoản không được để trống';
  } else if (payload.username.trim().length > 100) {
    errors.username = 'Tên tài khoản không vượt quá 100 ký tự';
  } else if (!/^[a-zA-Z0-9_.-]+$/.test(payload.username.trim())) {
    errors.username = 'Tên tài khoản chỉ được dùng chữ cái, chữ số, dấu gạch ngang và gạch dưới';
  }

  if (!payload.fullName || !payload.fullName.trim()) {
    errors.fullName = 'Họ và tên không được để trống';
  } else if (payload.fullName.trim().length > 255) {
    errors.fullName = 'Họ tên không vượt quá 255 ký tự';
  }

  if (payload.email && payload.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email.trim())) {
      errors.email = 'Email không hợp lệ';
    } else if (payload.email.trim().length > 255) {
      errors.email = 'Email không vượt quá 255 ký tự';
    }
  }

  if (!payload.password) {
    errors.password = 'Mật khẩu không được để trống';
  } else if (payload.password.length < 8 || payload.password.length > 100) {
    errors.password = 'Mật khẩu phải từ 8 đến 100 ký tự';
  }

  if (!payload.roleCodes || payload.roleCodes.length === 0) {
    errors.roleCodes = 'Phải chọn ít nhất 01 vai trò cho người dùng';
  }

  return errors;
}

export function validateUpdateUser(payload: Partial<UpdateUserPayload>): FormErrors {
  const errors: FormErrors = {};

  if (!payload.fullName || !payload.fullName.trim()) {
    errors.fullName = 'Họ và tên không được để trống';
  } else if (payload.fullName.trim().length > 255) {
    errors.fullName = 'Họ tên không vượt quá 255 ký tự';
  }

  if (payload.email && payload.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email.trim())) {
      errors.email = 'Email không hợp lệ';
    } else if (payload.email.trim().length > 255) {
      errors.email = 'Email không vượt quá 255 ký tự';
    }
  }

  if (payload.password && payload.password.trim()) {
    if (payload.password.length < 8 || payload.password.length > 100) {
      errors.password = 'Mật khẩu mới phải từ 8 đến 100 ký tự';
    }
  }

  if (payload.roleCodes !== undefined && payload.roleCodes.length === 0) {
    errors.roleCodes = 'Phải chọn ít nhất 01 vai trò cho người dùng';
  }

  return errors;
}
