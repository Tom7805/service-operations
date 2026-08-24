export interface AuthSession {
  accessToken: string;
  tokenType: string;
  userId: number;
  username: string;
  fullName: string;
  roles: string[];
}

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
  token: string;
  newPassword: string;
}
