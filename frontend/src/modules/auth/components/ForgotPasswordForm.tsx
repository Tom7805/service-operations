import { useState, type FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { AuthApiError, forgotPassword } from '../api/authApi';
import { validateForgotPasswordForm, type ForgotPasswordFormErrors } from '../validators/authValidators';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<ForgotPasswordFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateForgotPasswordForm({ email });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (err) {
      setServerError(
        err instanceof AuthApiError ? err.message : 'Không thể gửi yêu cầu khôi phục mật khẩu. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="login-card">
        <h2>Kiểm tra email của bạn</h2>
        <p className="login-card__intro">
          Nếu <strong>{email.trim()}</strong> là email đã đăng ký trong hệ thống, một liên kết khôi phục mật
          khẩu đã được gửi và có hiệu lực trong 30 phút.
        </p>
        <button type="button" className="submit" onClick={onBackToLogin}>
          Quay lại đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="login-card">
      <h2>Quên mật khẩu?</h2>
      <p className="login-card__intro">Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</p>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="forgot-email">Email</label>
        <div className="field">
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({});
            }}
            placeholder="ban@congty.com"
            disabled={submitting}
          />
        </div>
        {errors.email && (
          <p className="form-error" role="alert">
            <span>!</span>
            {errors.email}
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
              Đang gửi
            </>
          ) : (
            <>
              Gửi liên kết khôi phục <span className="icon-sm">{ICONS.arrowRight}</span>
            </>
          )}
        </button>
      </form>
      <div className="form-options" style={{ marginTop: 16 }}>
        <a
          href="#login"
          onClick={(e) => {
            e.preventDefault();
            onBackToLogin();
          }}
        >
          <span className="icon-sm">{ICONS.arrowLeft}</span> Quay lại đăng nhập
        </a>
      </div>
    </div>
  );
}
