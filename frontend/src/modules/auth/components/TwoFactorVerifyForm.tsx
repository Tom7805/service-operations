import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { AuthApiError, verifyTwoFactor } from '../api/authApi';
import type { AuthSession } from '../types/authTypes';
import { validateTwoFactorVerifyForm, type TwoFactorVerifyFormErrors } from '../validators/authValidators';

interface TwoFactorVerifyFormProps {
  challengeToken: string;
  username: string;
  /** true = lần đầu bật 2FA cho tài khoản này, chưa liên kết app Authenticator nào — cần hiện QR. */
  totpEnrollment: boolean;
  otpauthUri: string | null;
  totpSecretForDisplay: string | null;
  onVerified: (session: AuthSession) => void;
  onBackToLogin: () => void;
}

/** Vẽ mã QR từ chuỗi otpauth:// ngay trên trình duyệt — không gọi dịch vụ ngoài nào, khóa bí mật không rời máy người dùng thêm lần nữa. */
function useQrCodeDataUrl(otpauthUri: string | null) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!otpauthUri) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(otpauthUri, { width: 200, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [otpauthUri]);

  return dataUrl;
}

/** NCL-01-CN-009 — bước 2 của đăng nhập: xác thực hai bước kiểu Google Authenticator/Authy (TOTP). */
export default function TwoFactorVerifyForm({
  challengeToken,
  username,
  totpEnrollment,
  otpauthUri,
  totpSecretForDisplay,
  onVerified,
  onBackToLogin,
}: TwoFactorVerifyFormProps) {
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<TwoFactorVerifyFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const qrDataUrl = useQrCodeDataUrl(totpEnrollment ? otpauthUri : null);

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
      // NCL-01-CN-009-TC-02: sai mã quá số lần cho phép → ACCOUNT_LOCKED; message đã sẵn tiếng Việt từ backend.
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
        <span>{totpEnrollment ? 'Thiết lập xác thực hai bước' : 'Xác thực hai bước'}</span>
      </div>

      {totpEnrollment ? (
        <>
          <h2>Liên kết ứng dụng Authenticator</h2>
          <p className="login-card__intro">
            Tài khoản <strong>{username}</strong> thuộc vai trò yêu cầu xác thực hai bước để bảo vệ dữ liệu tài
            chính. Đây là lần đầu thiết lập — làm theo 3 bước dưới đây bằng{' '}
            <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> hoặc{' '}
            <strong>Authy</strong>.
          </p>

          <ol className="totp-setup-steps">
            <li>
              <span className="totp-setup-steps__num">1</span>
              <div>
                <strong>Mở app Authenticator</strong> trên điện thoại, chọn "Thêm tài khoản" → "Quét mã QR".
              </div>
            </li>
            <li>
              <span className="totp-setup-steps__num">2</span>
              <div>
                <strong>Quét mã dưới đây</strong>
                <div className="totp-qr-box" data-testid="totp-qr-box">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Mã QR thiết lập xác thực hai bước" width={180} height={180} />
                  ) : (
                    <div className="totp-qr-box__placeholder" aria-hidden="true" />
                  )}
                </div>
                {totpSecretForDisplay && (
                  <details className="totp-manual-entry">
                    <summary>Không quét được QR? Nhập khóa thủ công</summary>
                    <code data-testid="totp-secret">{totpSecretForDisplay}</code>
                  </details>
                )}
              </div>
            </li>
            <li>
              <span className="totp-setup-steps__num">3</span>
              <div>
                <strong>Nhập mã 6 số</strong> đang hiển thị trên app để xác nhận đã liên kết thành công.
              </div>
            </li>
          </ol>
        </>
      ) : (
        <>
          <h2>Nhập mã xác thực</h2>
          <p className="login-card__intro">
            Tài khoản <strong>{username}</strong> thuộc vai trò yêu cầu xác thực hai bước để bảo vệ dữ liệu tài
            chính. Mở ứng dụng Authenticator đã liên kết và nhập mã 6 số đang hiển thị — mã tự đổi mới mỗi 30
            giây, không cần chờ gửi qua email hay tin nhắn.
          </p>
        </>
      )}

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
              {totpEnrollment ? 'Xác nhận thiết lập' : 'Xác nhận'} <span>→</span>
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
