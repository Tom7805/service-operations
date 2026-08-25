import { useState, type FormEvent } from 'react';
import { AuthApiError, verifyTwoFactor } from '../api/authApi';
import type { AuthSession } from '../types/authTypes';
import { validateTwoFactorVerifyForm, type TwoFactorVerifyFormErrors } from '../validators/authValidators';

interface TwoFactorVerifyFormProps {
  challengeToken: string;
  username: string;
  onVerified: (session: AuthSession) => void;
  onBackToLogin: () => void;
}

/** NCL-01-CN-009 — bước 2 của đăng nhập: nộp mã một lần (OTP) cho tài khoản xem dữ liệu tài chính. */
export default function TwoFactorVerifyForm({
  challengeToken,
  username,
  onVerified,
  onBackToLogin,
}: TwoFactorVerifyFormProps) {
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<TwoFactorVerifyFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateTwoFactorVerifyForm({ otp });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const session = await verifyTwoFactor({ challengeToken, otp: otp.trim() });
      onVerified(session);
    } catch (err) {
      // NCL-01-CN-009-TC-02: sai OTP quá số lần cho phép → ACCOUNT_LOCKED; message đã sẵn tiếng Việt từ backend.
      setServerError(
        err instanceof AuthApiError ? err.message : 'Không thể xác thực mã. Vui lòng thử lại.'
      );
      setOtp('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-card">
      <div className="panel-heading">
        <span className="panel-heading__signal" />
        <span>Xác thực hai bước</span>
      </div>
      <h2>Nhập mã xác thực</h2>
      <p className="login-card__intro">
        Tài khoản <strong>{username}</strong> thuộc vai trò yêu cầu xác thực hai bước để bảo vệ dữ liệu tài
        chính. Mã một lần gồm 6 chữ số đã được gửi qua kênh đã cấu hình và có hiệu lực trong ít phút.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="two-factor-otp">Mã xác thực</label>
        <div className="field">
          <input
            id="two-factor-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => {
              const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 6);
              setOtp(digitsOnly);
              if (errors.otp) setErrors({});
              if (serverError) setServerError(null);
            }}
            placeholder="Nhập mã gồm 6 chữ số"
            disabled={submitting}
            style={{ letterSpacing: '0.4em', textAlign: 'center', fontWeight: 700 }}
          />
        </div>
        {errors.otp && (
          <p className="form-error" role="alert">
            <span>!</span>
            {errors.otp}
          </p>
        )}
        {serverError && (
          <p className="form-error" role="alert">
            <span>!</span>
            {serverError}
          </p>
        )}
        <button className="submit" type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <i className="loader" />
              Đang xác thực
            </>
          ) : (
            <>
              Xác nhận <span>→</span>
            </>
          )}
        </button>
      </form>
      <div className="secure-note">
        <span>✓</span>
        <p>Nhập sai mã quá 3 lần liên tiếp, tài khoản sẽ tạm khóa để bảo vệ dữ liệu.</p>
      </div>
      <div className="form-options" style={{ marginTop: 16 }}>
        <a
          href="#login"
          onClick={(event) => {
            event.preventDefault();
            onBackToLogin();
          }}
        >
          ← Quay lại đăng nhập
        </a>
      </div>
    </div>
  );
}
