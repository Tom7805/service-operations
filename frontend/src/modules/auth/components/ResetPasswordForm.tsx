import { useState, type FormEvent } from 'react';
import { AuthApiError, resetPassword } from '../api/authApi';
import { validateResetPasswordForm, type ResetPasswordFormErrors } from '../validators/authValidators';

interface ResetPasswordFormProps {
  /** Email người dùng vừa nhập ở bước "quên mật khẩu". */
  email: string;
  onDone: () => void;
  /** Quay lại bước nhập email để xin mã mới. */
  onRequestNewCode: () => void;
}

/**
 * NCL-01-CN-008 — nhập mã khôi phục 6 chữ số + đặt mật khẩu mới.
 *
 * Trước đây màn này nhận một token dài từ `?token=...` trên URL và gọi API kiểm
 * tra hiệu lực trước khi hiện form. Nay đổi sang mã 6 số gõ tay, nên:
 *
 * - Không còn bước "kiểm tra trước". Với một liên kết, kiểm tra trước là đúng:
 *   người dùng bấm vào rồi mới biết nó hỏng thì rất bực. Với mã gõ tay thì
 *   ngược lại — kiểm tra trước sẽ tạo thêm một đường thử mã mà không tính vào
 *   số lần nhập sai, tức là đục thủng chính rào chắn chống dò.
 * - Mã và mật khẩu mới nhập trên CÙNG một màn hình: người dùng đang mở hộp thư,
 *   bắt họ qua hai bước chỉ để gõ 6 số là thừa.
 */
export default function ResetPasswordForm({ email, onDone, onRequestNewCode }: ResetPasswordFormProps) {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ResetPasswordFormErrors>({});
  const [codeError, setCodeError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setCodeError(null);

    if (!/^\d{6}$/.test(code)) {
      setCodeError('Mã khôi phục gồm đúng 6 chữ số');
      return;
    }

    const validationErrors = validateResetPasswordForm({ newPassword, confirmPassword });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ email, code, newPassword });
      setSuccess(true);
    } catch (err) {
      setServerError(
        err instanceof AuthApiError ? err.message : 'Không thể khôi phục mật khẩu. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

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
      <h2>Nhập mã khôi phục</h2>
      <p className="login-card__intro">
        Chúng tôi đã gửi mã gồm 6 chữ số tới <strong>{email}</strong>. Mã có hiệu lực trong 10 phút.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="reset-code">Mã khôi phục</label>
        <div className="field">
          <input
            id="reset-code"
            type="text"
            /* inputMode numeric + autoComplete one-time-code: điện thoại bật bàn
               phím số, và iOS/Android tự điền mã lấy từ thư đến. */
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ''));
              if (codeError) setCodeError(null);
            }}
            placeholder="000000"
            className="reset-code-input"
            disabled={submitting}
            autoFocus
          />
        </div>
        {codeError && (
          <p className="form-error" role="alert">
            <span>!</span>
            {codeError}
          </p>
        )}

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
          {submitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
        </button>
      </form>

      <div className="form-options" style={{ justifyContent: 'center', marginTop: 16 }}>
        <button type="button" className="link-button" onClick={onRequestNewCode}>
          Chưa nhận được mã? Gửi lại
        </button>
      </div>
    </div>
  );
}
