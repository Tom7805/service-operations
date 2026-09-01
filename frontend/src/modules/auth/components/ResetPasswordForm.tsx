import { useEffect, useState, type FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { AuthApiError, resetPassword, validateResetToken } from '../api/authApi';
import { validateResetPasswordForm, type ResetPasswordFormErrors } from '../validators/authValidators';

interface ResetPasswordFormProps {
  token: string;
  onDone: () => void;
}

export default function ResetPasswordForm({ token, onDone }: ResetPasswordFormProps) {
  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ResetPasswordFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    validateResetToken(token)
      .then((valid) => {
        if (!cancelled) setTokenValid(valid);
      })
      .catch(() => {
        if (!cancelled) setTokenValid(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateResetPasswordForm({ newPassword, confirmPassword });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword });
      setSuccess(true);
    } catch (err) {
      // NCL-01-CN-008-TC-02: liên kết hết hạn/đã dùng → RESET_TOKEN_INVALID (400)
      setServerError(
        err instanceof AuthApiError ? err.message : 'Không thể khôi phục mật khẩu. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="login-card">
        <p className="login-card__intro">Đang kiểm tra liên kết khôi phục mật khẩu...</p>
      </div>
    );
  }

  // NCL-01-CN-008-TC-02: liên kết không hợp lệ/hết hạn — kiểm tra TRƯỚC khi hiển thị form.
  if (!tokenValid && !success) {
    return (
      <div className="login-card">
        <h2>Liên kết đã hết hạn</h2>
        <p className="login-card__intro">
          Liên kết khôi phục mật khẩu không hợp lệ, đã hết hạn hoặc đã được sử dụng. Vui lòng gửi lại yêu cầu
          mới.
        </p>
        <button type="button" className="submit" onClick={onDone}>
          Quay lại đăng nhập
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="login-card">
        <h2>Đặt lại mật khẩu thành công</h2>
        <p className="login-card__intro">Vui lòng đăng nhập lại bằng mật khẩu mới.</p>
        <button type="button" className="submit" onClick={onDone}>
          Đến trang đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="login-card">
      <h2>Đặt mật khẩu mới</h2>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="reset-new-password">Mật khẩu mới</label>
        <div className="field">
          <input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errors.newPassword) setErrors({ ...errors, newPassword: undefined });
            }}
            placeholder="Ít nhất 8 ký tự, gồm cả chữ và số"
            disabled={submitting}
          />
        </div>
        {errors.newPassword && (
          <p className="form-error" role="alert">
            <span>!</span>
            {errors.newPassword}
          </p>
        )}

        <label htmlFor="reset-confirm-password">Xác nhận mật khẩu mới</label>
        <div className="field">
          <input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
            }}
            disabled={submitting}
          />
        </div>
        {errors.confirmPassword && (
          <p className="form-error" role="alert">
            <span>!</span>
            {errors.confirmPassword}
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
              Đang lưu
            </>
          ) : (
            <>
              Đặt lại mật khẩu <span className="icon-sm">{ICONS.arrowRight}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
