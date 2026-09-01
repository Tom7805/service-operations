import { useState, type FormEvent } from 'react';
import { AuthApiError, changePassword } from '../api/authApi';
import { validateChangePasswordForm, type ChangePasswordFormErrors } from '../validators/authValidators';
import { ICONS } from '../../../components/common/icons';

interface ChangePasswordFormProps {
  onSuccess: () => void;
}

export default function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [errors, setErrors] = useState<ChangePasswordFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateChangePasswordForm({ currentPassword, newPassword, confirmPassword });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      onSuccess();
    } catch (err) {
      // NCL-01-CN-008-TC-01: sai mật khẩu hiện tại → INVALID_CREDENTIALS (401)
      setServerError(err instanceof AuthApiError ? err.message : 'Không thể đổi mật khẩu. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{serverError}</span>
        </div>
      )}

      <div className="form-grid">
        <div className="form-field form-field--full">
          <label htmlFor="current-password-input" className="form-label">
            Mật khẩu hiện tại <span className="req">*</span>
          </label>
          <div className="password-input-wrap">
            <input
              id="current-password-input"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="current-password"
              className={`form-input ${errors.currentPassword ? 'form-input--error' : ''}`}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.currentPassword) setErrors({ ...errors, currentPassword: undefined });
              }}
              disabled={submitting}
            />
          </div>
          {errors.currentPassword && <span className="field-error">{errors.currentPassword}</span>}
        </div>

        <div className="form-field form-field--full">
          <label htmlFor="new-password-input" className="form-label">
            Mật khẩu mới <span className="req">*</span>
          </label>
          <div className="password-input-wrap">
            <input
              id="new-password-input"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              className={`form-input ${errors.newPassword ? 'form-input--error' : ''}`}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) setErrors({ ...errors, newPassword: undefined });
              }}
              placeholder="Ít nhất 8 ký tự, gồm cả chữ và số"
              disabled={submitting}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPasswords(!showPasswords)}
              tabIndex={-1}
            >
              {showPasswords ? ICONS.eyeOff : ICONS.eye}
            </button>
          </div>
          {errors.newPassword && <span className="field-error">{errors.newPassword}</span>}
        </div>

        <div className="form-field form-field--full">
          <label htmlFor="confirm-password-input" className="form-label">
            Xác nhận mật khẩu mới <span className="req">*</span>
          </label>
          <input
            id="confirm-password-input"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="new-password"
            className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
            }}
            disabled={submitting}
          />
          {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
        </div>
      </div>

      <div className="confirm-note-box">
        <span className="confirm-note-box__icon">{ICONS.info}</span>
        <span>
          Sau khi đổi mật khẩu thành công, mọi phiên đăng nhập hiện tại (kể cả phiên bạn đang dùng) sẽ hết
          hiệu lực và bạn cần đăng nhập lại.
        </span>
      </div>

      <div className="modal-footer" style={{ padding: '18px 0 0', border: 'none', background: 'none' }}>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Đang lưu...' : 'Đổi mật khẩu'}
        </button>
      </div>
    </form>
  );
}
