export interface AuthSession {
  accessToken: string;
  tokenType: string;
  userId: number;
  username: string;
  fullName: string;
  roles: string[];
}

/** Thông tin phiên hiện tại từ GET /auth/me — dùng để làm mới vai trò/họ tên khi đang đăng nhập. */
export type CurrentUser = Pick<AuthSession, 'userId' | 'username' | 'fullName' | 'roles'>;

export interface ApiError {
  errorCode?: string;
  message?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  /** Email đã nhập ở bước "quên mật khẩu" — máy chủ tra cứu mã theo người dùng. */
  email: string;
  /** Mã 6 chữ số nhận qua thư điện tử. */
  code: string;
  newPassword: string;
}

/**
 * NCL-01-CN-009 — xác thực hai bước (2FA) kiểu Google Authenticator/Authy (TOTP)
 * cho tài khoản xem dữ liệu tài chính.
 */

/** Hình dạng thô của LoginRes trả về từ backend — dùng nội bộ trong authApi để phân biệt hai nhánh. */
export interface LoginResponseDto {
  accessToken: string | null;
  tokenType: string | null;
  userId: number;
  username: string;
  fullName: string;
  roles: string[];
  requiresTwoFactor: boolean;
  challengeToken: string | null;
  /** true nếu đây là lần đầu tài khoản bật 2FA — chưa liên kết app Authenticator nào, cần quét QR. */
  totpEnrollment: boolean;
  /** Chuỗi otpauth:// để vẽ QR — chỉ có khi totpEnrollment = true. */
  otpauthUri: string | null;
  /** Khóa bí mật định dạng dễ đọc — fallback nhập tay khi không quét được QR. */
  totpSecretForDisplay: string | null;
}

/** Kết quả bước 1 khi tài khoản thuộc vai trò đang bật 2FA — chưa có JWT, cần nộp mã TOTP (TC-01). */
export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  challengeToken: string;
  username: string;
  /** true = lần đầu thiết lập, cần hiện QR để quét bằng Google Authenticator/Authy. */
  totpEnrollment: boolean;
  otpauthUri: string | null;
  totpSecretForDisplay: string | null;
}

/** login() trả về một trong hai: đăng nhập xong ngay, hoặc còn chờ xác thực OTP. */
export type LoginResult = AuthSession | TwoFactorChallenge;

export interface TwoFactorVerifyPayload {
  challengeToken: string;
  otp: string;
}

/** Trạng thái bật/tắt 2FA của một vai trò — dùng cho màn hình cấu hình của quản trị viên. */
export interface TwoFactorRoleConfig {
  roleId: number;
  roleCode: string;
  roleName: string;
  enabled: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface TwoFactorConfigPayload {
  enabled: boolean;
}
