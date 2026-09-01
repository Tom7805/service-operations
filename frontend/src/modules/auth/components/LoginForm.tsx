import { FormEvent, useState } from 'react';
import { isTwoFactorChallenge, login, LoginRequestError } from '../api/authApi';
import type { AuthSession, TwoFactorChallenge } from '../types/authTypes';

interface LoginFormProps {
  onAuthenticated: (session: AuthSession) => void;
  onForgotPassword?: () => void;
  /** NCL-01-CN-009: vai trò đang bật 2FA — chuyển sang màn hình nhập mã TOTP thay vì đăng nhập thẳng. */
  onTwoFactorRequired?: (challenge: TwoFactorChallenge) => void;
}

const EyeIcon = ({ visible }: { visible: boolean }) => visible ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 12s3.3-5.8 9.8-5.8S21.8 12 21.8 12s-3.3 5.8-9.8 5.8S2.2 12 2.2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 6.3A10.7 10.7 0 0 1 12 6.2c6.5 0 9.8 5.8 9.8 5.8a17 17 0 0 1-3.4 3.9M6.1 6.1A17 17 0 0 0 2.2 12s3.3 5.8 9.8 5.8a10.5 10.5 0 0 0 3.1-.5" /><path d="M9.7 9.7a3.3 3.3 0 0 0 4.6 4.6" /></svg>;

export default function LoginForm({ onAuthenticated, onForgotPassword, onTwoFactorRequired }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
      return;
    }
    setLoading(true); setError('');
    try {
      const result = await login(username.trim(), password);
      if (isTwoFactorChallenge(result)) {
        onTwoFactorRequired?.(result);
      } else {
        onAuthenticated(result);
      }
    }
    catch (reason) {
      const requestError = reason instanceof LoginRequestError ? reason : null;
      const message = requestError?.message ?? 'Đăng nhập chưa thành công. Vui lòng thử lại.';
      setError(message);
    } finally { setLoading(false); }
  }

  return <div className="login-card">
    <h2>Chào mừng bạn trở lại</h2>
    <p className="login-card__intro">Đăng nhập để tiếp tục công việc của bạn.</p>
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="username">Tài khoản</label>
      <div className="field"><input id="username" autoComplete="username" value={username} onChange={(event) => { setUsername(event.target.value); if (error) setError(''); }} placeholder="Nhập tên tài khoản" disabled={loading} /></div>
      <label htmlFor="password">Mật khẩu</label>
      <div className="field"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError(''); }} placeholder="Nhập mật khẩu" disabled={loading} /><button type="button" className="field__toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}><EyeIcon visible={showPassword} /></button></div>
      <div className="form-options"><label className="checkbox"><input type="checkbox" /> <span>Ghi nhớ đăng nhập</span></label><a href="#forgot-password" onClick={(event) => { event.preventDefault(); onForgotPassword?.(); }}>Quên mật khẩu?</a></div>
      {error && <p className="form-error" role="alert"><span>!</span>{error}</p>}
      <button className="submit" type="submit" disabled={loading}>{loading ? <><i className="loader" />Đang xác thực</> : <><i className="submit__shine" />Đăng nhập <span>→</span></>}</button>
    </form>
    <div className="secure-note"><span>✓</span><p>Phiên đăng nhập được bảo vệ và tự động kết thúc khi không hoạt động.</p></div>
    <p className="login-card__privacy">Bằng việc tiếp tục, bạn xác nhận đã đọc và đồng ý với<br /><a href="#terms">Điều khoản sử dụng</a> và <a href="#privacy">Chính sách bảo mật</a>.</p>
  </div>;
}
